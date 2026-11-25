from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.database import db
from app.models.company import Company, WorkLocation, Department
from app.utils.decorators import token_required, role_required
from app.utils.audit import log_audit

company_bp = Blueprint('company', __name__, url_prefix='/api/company')

@company_bp.route('', methods=['GET'])
@token_required
def get_company():
    comp = Company.query.first()
    if not comp:
        comp = Company(name='GROUPON POWER INFRA & LABOUR LTD')
        db.session.add(comp)
        db.session.commit()
    return jsonify({'company': comp.to_dict()}), 200

@company_bp.route('', methods=['PUT'])
@token_required
@role_required('Super Admin')
def update_company():
    comp = Company.query.first()
    if not comp:
        comp = Company(name='GROUPON POWER INFRA & LABOUR LTD')
        db.session.add(comp)

    data = request.get_json() or {}
    fields = [
        'name', 'logo_url', 'registered_address', 'gst_no', 'pan_no', 'tan_no',
        'pf_establishment_code', 'esic_employer_code', 'bank_name', 'bank_account_no',
        'bank_ifsc', 'bank_branch', 'contact_email', 'contact_phone', 'financial_year',
        'default_overtime_multiplier', 'daily_working_hours'
    ]
    for f in fields:
        if f in data:
            setattr(comp, f, data[f])

    db.session.commit()
    user_id = int(get_jwt_identity())
    log_audit(user_id=user_id, action='COMPANY_UPDATE', entity_type='Company', entity_id=comp.id)

    return jsonify({'message': 'Company settings updated successfully', 'company': comp.to_dict()}), 200

# Departments
@company_bp.route('/departments', methods=['GET'])
@token_required
def get_departments():
    depts = Department.query.order_by(Department.department_name.asc()).all()
    return jsonify({'departments': [d.to_dict() for d in depts]}), 200

@company_bp.route('/departments', methods=['POST'])
@token_required
@role_required('Super Admin', 'HR Manager')
def create_department():
    data = request.get_json() or {}
    name = data.get('department_name', '').strip()
    code = data.get('code', '').strip().upper()
    if not name or not code:
        return jsonify({'error': 'Department name and code are required'}), 400

    comp = Company.query.first()
    dept = Department(
        company_id=comp.id if comp else 1,
        department_name=name,
        code=code,
        description=data.get('description')
    )
    db.session.add(dept)
    db.session.commit()
    return jsonify({'message': 'Department created successfully', 'department': dept.to_dict()}), 201

# Locations
@company_bp.route('/locations', methods=['GET'])
@token_required
def get_locations():
    locations = WorkLocation.query.order_by(WorkLocation.location_name.asc()).all()
    return jsonify({'locations': [l.to_dict() for l in locations]}), 200

@company_bp.route('/locations', methods=['POST'])
@token_required
@role_required('Super Admin', 'HR Manager')
def create_location():
    data = request.get_json() or {}
    name = data.get('location_name', '').strip()
    code = data.get('code', '').strip().upper()
    if not name:
        return jsonify({'error': 'Location name is required'}), 400

    comp = Company.query.first()
    loc = WorkLocation(
        company_id=comp.id if comp else 1,
        location_name=name,
        code=code or name[:3].upper(),
        address=data.get('address'),
        city=data.get('city'),
        state=data.get('state', 'Gujarat')
    )
    db.session.add(loc)
    db.session.commit()
    return jsonify({'message': 'Work location created successfully', 'location': loc.to_dict()}), 201
