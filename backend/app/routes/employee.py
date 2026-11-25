import io
import csv
from datetime import datetime, date
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import get_jwt_identity
from app.database import db
from app.models.employee import Employee, SalaryStructure, EmployeeDocument
from app.models.company import Department, WorkLocation, Company
from app.models.user import User
from app.utils.decorators import token_required, role_required
from app.utils.audit import log_audit

employee_bp = Blueprint('employees', __name__, url_prefix='/api/employees')

def generate_emp_code():
    comp = Company.query.first()
    prefix = "GP"
    last_emp = Employee.query.order_by(Employee.id.desc()).first()
    next_num = (last_emp.id + 1) if last_emp else 1
    return f"{prefix}-{next_num:04d}"

@employee_bp.route('', methods=['GET'])
@token_required
def get_employees():
    current_uid = int(get_jwt_identity())
    current_user = User.query.get(current_uid)
    is_viewer = (current_user.role and current_user.role.name == 'Viewer')

    query = Employee.query

    # Filters
    search = request.args.get('search', '').strip()
    if search:
        query = query.filter(
            (Employee.full_name.ilike(f'%{search}%')) |
            (Employee.emp_code.ilike(f'%{search}%')) |
            (Employee.phone.ilike(f'%{search}%'))
        )

    dept_id = request.args.get('department_id', type=int)
    if dept_id:
        query = query.filter(Employee.department_id == dept_id)

    loc_id = request.args.get('location_id', type=int)
    if loc_id:
        query = query.filter(Employee.location_id == loc_id)

    category = request.args.get('category')
    if category:
        query = query.filter(Employee.employment_category == category)

    wage_type = request.args.get('wage_type')
    if wage_type:
        query = query.filter(Employee.wage_type == wage_type)

    status = request.args.get('status')
    if status:
        query = query.filter(Employee.status == status)

    employees = query.order_by(Employee.id.desc()).all()
    
    return jsonify({
        'employees': [e.to_dict(include_financial=not is_viewer) for e in employees],
        'total': len(employees)
    }), 200

@employee_bp.route('/<int:emp_id>', methods=['GET'])
@token_required
def get_employee(emp_id):
    emp = Employee.query.get_or_404(emp_id)
    current_uid = int(get_jwt_identity())
    current_user = User.query.get(current_uid)
    is_viewer = (current_user.role and current_user.role.name == 'Viewer')

    data = emp.to_dict(include_financial=not is_viewer)
    salary_struct = SalaryStructure.query.filter_by(employee_id=emp.id, is_active=True).first()
    data['salary_structure'] = salary_struct.to_dict() if salary_struct else None
    data['documents'] = [d.to_dict() for d in emp.documents]
    return jsonify({'employee': data}), 200

@employee_bp.route('', methods=['POST'])
@token_required
@role_required('Super Admin', 'HR Manager', 'Payroll Manager')
def create_employee():
    current_uid = int(get_jwt_identity())
    data = request.get_json() or {}

    full_name = data.get('full_name', '').strip()
    phone = data.get('phone', '').strip()
    designation = data.get('designation', '').strip()

    if not full_name or not phone or not designation:
        return jsonify({'error': 'Full name, phone, and designation are required'}), 400

    emp_code = data.get('emp_code', '').strip()
    if not emp_code:
        emp_code = generate_emp_code()
    else:
        if Employee.query.filter_by(emp_code=emp_code).first():
            return jsonify({'error': f"Employee with code '{emp_code}' already exists"}), 400

    # Parse dates safely
    join_date_val = date.today()
    if data.get('join_date'):
        try:
            join_date_val = datetime.strptime(data['join_date'], '%Y-%m-%d').date()
        except Exception:
            pass

    dob_val = None
    if data.get('dob'):
        try:
            dob_val = datetime.strptime(data['dob'], '%Y-%m-%d').date()
        except Exception:
            pass

    comp = Company.query.first()
    emp = Employee(
        emp_code=emp_code,
        company_id=comp.id if comp else 1,
        location_id=data.get('location_id'),
        department_id=data.get('department_id'),
        full_name=full_name,
        father_name=data.get('father_name'),
        dob=dob_val,
        gender=data.get('gender', 'Male'),
        phone=phone,
        email=data.get('email'),
        address=data.get('address'),
        emergency_contact=data.get('emergency_contact'),
        emergency_phone=data.get('emergency_phone'),
        designation=designation,
        employment_category=data.get('employment_category', 'Daily Wage Worker'),
        employment_type=data.get('employment_type', 'Full-Time'),
        join_date=join_date_val,
        supervisor_name=data.get('supervisor_name'),
        status='Active',
        is_active=True,
        wage_type=data.get('wage_type', 'daily_wage'),
        daily_wage_rate=float(data.get('daily_wage_rate', 0.0) or 0.0),
        monthly_salary=float(data.get('monthly_salary', 0.0) or 0.0),
        bank_name=data.get('bank_name'),
        bank_account_no=data.get('bank_account_no'),
        bank_ifsc=data.get('bank_ifsc'),
        uan=data.get('uan'),
        esic_ip_number=data.get('esic_ip_number'),
        pan=data.get('pan'),
        pf_applicable=bool(data.get('pf_applicable', True)),
        esic_applicable=bool(data.get('esic_applicable', True)),
        pt_applicable=bool(data.get('pt_applicable', True)),
        tds_applicable=bool(data.get('tds_applicable', False))
    )
    db.session.add(emp)
    db.session.flush()

    # Create default Salary Structure if provided
    struct_data = data.get('salary_structure') or {}
    struct = SalaryStructure(
        employee_id=emp.id,
        effective_from=join_date_val,
        basic_pay=float(struct_data.get('basic_pay') or (emp.daily_wage_rate if emp.wage_type == 'daily_wage' else emp.monthly_salary)),
        da=float(struct_data.get('da', 0.0) or 0.0),
        hra=float(struct_data.get('hra', 0.0) or 0.0),
        conveyance=float(struct_data.get('conveyance', 0.0) or 0.0),
        special_allowance=float(struct_data.get('special_allowance', 0.0) or 0.0),
        other_allowances=float(struct_data.get('other_allowances', 0.0) or 0.0),
        incentive=float(struct_data.get('incentive', 0.0) or 0.0),
        production_bonus=float(struct_data.get('production_bonus', 0.0) or 0.0),
        overtime_rate_per_hour=float(struct_data.get('overtime_rate_per_hour', 0.0) or 0.0),
        is_active=True
    )
    db.session.add(struct)
    db.session.commit()

    log_audit(user_id=current_uid, action='EMPLOYEE_CREATE', entity_type='Employee', entity_id=emp.id, details={'code': emp.emp_code, 'name': emp.full_name})

    return jsonify({'message': 'Employee created successfully', 'employee': emp.to_dict()}), 201

@employee_bp.route('/<int:emp_id>', methods=['PUT'])
@token_required
@role_required('Super Admin', 'HR Manager', 'Payroll Manager')
def update_employee(emp_id):
    current_uid = int(get_jwt_identity())
    emp = Employee.query.get_or_404(emp_id)
    data = request.get_json() or {}

    fields = [
        'full_name', 'father_name', 'gender', 'phone', 'email', 'address',
        'emergency_contact', 'emergency_phone', 'designation', 'employment_category',
        'employment_type', 'supervisor_name', 'status', 'wage_type', 'daily_wage_rate',
        'monthly_salary', 'bank_name', 'bank_account_no', 'bank_ifsc', 'uan',
        'esic_ip_number', 'pan', 'pf_applicable', 'esic_applicable', 'pt_applicable',
        'tds_applicable', 'location_id', 'department_id'
    ]
    for f in fields:
        if f in data:
            val = data[f]
            if f in ['daily_wage_rate', 'monthly_salary']:
                val = float(val or 0.0)
            elif f in ['pf_applicable', 'esic_applicable', 'pt_applicable', 'tds_applicable']:
                val = bool(val)
            setattr(emp, f, val)

    if 'is_active' in data:
        emp.is_active = bool(data['is_active'])

    # Update or add salary structure
    if 'salary_structure' in data and data['salary_structure']:
        s_data = data['salary_structure']
        struct = SalaryStructure.query.filter_by(employee_id=emp.id, is_active=True).first()
        if not struct:
            struct = SalaryStructure(employee_id=emp.id, is_active=True)
            db.session.add(struct)
        
        for k in ['basic_pay', 'da', 'hra', 'conveyance', 'special_allowance', 'other_allowances', 'incentive', 'production_bonus', 'overtime_rate_per_hour']:
            if k in s_data:
                setattr(struct, k, float(s_data[k] or 0.0))

    db.session.commit()
    log_audit(user_id=current_uid, action='EMPLOYEE_UPDATE', entity_type='Employee', entity_id=emp.id)

    return jsonify({'message': 'Employee updated successfully', 'employee': emp.to_dict()}), 200

@employee_bp.route('/<int:emp_id>/toggle-status', methods=['PUT'])
@token_required
@role_required('Super Admin', 'HR Manager')
def toggle_employee_status(emp_id):
    emp = Employee.query.get_or_404(emp_id)
    emp.is_active = not emp.is_active
    emp.status = 'Active' if emp.is_active else 'Inactive'
    db.session.commit()
    user_id = int(get_jwt_identity())
    log_audit(user_id=user_id, action='EMPLOYEE_STATUS_TOGGLE', entity_type='Employee', entity_id=emp.id, details={'status': emp.status})
    return jsonify({'message': f"Employee status updated to {emp.status}", 'employee': emp.to_dict()}), 200

@employee_bp.route('/export/csv', methods=['GET'])
@token_required
def export_employees_csv():
    employees = Employee.query.order_by(Employee.id.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        'Employee ID', 'Full Name', 'Father Name', 'Phone', 'Email',
        'Department', 'Location', 'Designation', 'Category', 'Wage Type',
        'Rate', 'Bank Account', 'IFSC', 'UAN', 'ESIC Number', 'PAN', 'Status'
    ])

    for e in employees:
        rate = e.daily_wage_rate if e.wage_type == 'daily_wage' else e.monthly_salary
        writer.writerow([
            e.emp_code, e.full_name, e.father_name or '', e.phone, e.email or '',
            e.department.department_name if e.department else '',
            e.work_location.location_name if e.work_location else '',
            e.designation, e.employment_category, e.wage_type, rate,
            e.bank_account_no or '', e.bank_ifsc or '', e.uan or '',
            e.esic_ip_number or '', e.pan or '', e.status
        ])

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={"Content-Disposition": "attachment;filename=groupon_power_employees.csv"}
    )

@employee_bp.route('/bulk-import', methods=['POST'])
@token_required
@role_required('Super Admin', 'HR Manager')
def bulk_import():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    rows = data.get('rows', [])
    if not rows:
        return jsonify({'error': 'No employee rows provided for import'}), 400

    imported = 0
    errors = []

    for idx, row in enumerate(rows):
        try:
            full_name = row.get('full_name', '').strip()
            phone = str(row.get('phone', '')).strip()
            designation = row.get('designation', '').strip() or 'Labourer'
            if not full_name or not phone:
                errors.append(f"Row {idx+1}: missing full_name or phone")
                continue

            emp_code = row.get('emp_code', '').strip() or generate_emp_code()
            if Employee.query.filter_by(emp_code=emp_code).first():
                errors.append(f"Row {idx+1}: Employee code {emp_code} already exists")
                continue

            wage_type = row.get('wage_type', 'daily_wage').strip()
            rate = float(row.get('rate') or row.get('daily_wage_rate') or row.get('monthly_salary') or 500.0)

            emp = Employee(
                emp_code=emp_code,
                full_name=full_name,
                phone=phone,
                designation=designation,
                employment_category=row.get('category', 'Daily Wage Worker'),
                wage_type=wage_type,
                daily_wage_rate=rate if wage_type == 'daily_wage' else 0.0,
                monthly_salary=rate if wage_type == 'monthly_salary' else 0.0,
                bank_account_no=row.get('bank_account_no'),
                bank_ifsc=row.get('bank_ifsc'),
                uan=row.get('uan'),
                status='Active',
                is_active=True
            )
            db.session.add(emp)
            db.session.flush()

            struct = SalaryStructure(
                employee_id=emp.id,
                basic_pay=rate,
                is_active=True
            )
            db.session.add(struct)
            imported += 1
        except Exception as e:
            errors.append(f"Row {idx+1}: {str(e)}")

    db.session.commit()
    log_audit(user_id=user_id, action='EMPLOYEE_BULK_IMPORT', entity_type='Employee', entity_id=None, details={'imported': imported, 'errors': len(errors)})

    return jsonify({
        'message': f"Successfully imported {imported} employees",
        'imported': imported,
        'errors': errors
    }), 200
