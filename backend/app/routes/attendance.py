import calendar
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.database import db
from app.models.attendance import Attendance, AttendanceApproval
from app.models.employee import Employee
from app.services.attendance_service import AttendanceService
from app.utils.decorators import token_required, role_required

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

@attendance_bp.route('', methods=['GET'])
@token_required
def get_daily_attendance():
    date_str = request.args.get('date', date.today().isoformat())
    target_date = datetime.strptime(date_str, '%Y-%m-%d').date()

    dept_id = request.args.get('department_id', type=int)
    loc_id = request.args.get('location_id', type=int)

    # Fetch active employees
    emp_query = Employee.query.filter(Employee.is_active == True, Employee.status == 'Active')
    if dept_id:
        emp_query = emp_query.filter(Employee.department_id == dept_id)
    if loc_id:
        emp_query = emp_query.filter(Employee.location_id == loc_id)

    employees = emp_query.order_by(Employee.id.asc()).all()
    emp_ids = [e.id for e in employees]

    # Existing attendance records for this date
    att_map = {
        a.employee_id: a
        for a in Attendance.query.filter(Attendance.date == target_date, Attendance.employee_id.in_(emp_ids)).all()
    } if emp_ids else {}

    results = []
    for emp in employees:
        att = att_map.get(emp.id)
        results.append({
            'employee_id': emp.id,
            'emp_code': emp.emp_code,
            'full_name': emp.full_name,
            'department_name': emp.department.department_name if emp.department else 'N/A',
            'designation': emp.designation,
            'wage_type': emp.wage_type,
            'status': att.status if att else 'Absent',
            'check_in': att.check_in.strftime('%H:%M') if (att and att.check_in) else '',
            'check_out': att.check_out.strftime('%H:%M') if (att and att.check_out) else '',
            'working_hours': att.working_hours if att else 0.0,
            'overtime_hours': att.overtime_hours if att else 0.0,
            'shift': att.shift if att else 'General',
            'remarks': att.remarks if att else '',
            'is_locked': att.is_locked if att else False
        })

    # Summary
    summary = {
        'total': len(results),
        'present': sum(1 for r in results if r['status'] == 'Present'),
        'absent': sum(1 for r in results if r['status'] == 'Absent'),
        'half_day': sum(1 for r in results if r['status'] == 'Half Day'),
        'paid_leave': sum(1 for r in results if r['status'] == 'Paid Leave'),
        'weekly_off': sum(1 for r in results if r['status'] == 'Weekly Off'),
        'holiday': sum(1 for r in results if r['status'] == 'Holiday'),
        'total_ot_hours': sum(r['overtime_hours'] for r in results)
    }

    return jsonify({
        'date': target_date.isoformat(),
        'records': results,
        'summary': summary
    }), 200

@attendance_bp.route('', methods=['POST'])
@token_required
@role_required('Super Admin', 'HR Manager', 'Payroll Manager')
def mark_attendance():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    emp_id = data.get('employee_id')
    date_str = data.get('date')
    status = data.get('status', 'Present')

    if not emp_id or not date_str:
        return jsonify({'error': 'Employee ID and date are required'}), 400

    target_date = datetime.strptime(date_str, '%Y-%m-%d').date()

    try:
        att = AttendanceService.mark_attendance(
            employee_id=emp_id,
            att_date=target_date,
            status=status,
            check_in=data.get('check_in'),
            check_out=data.get('check_out'),
            working_hours=data.get('working_hours', 8.0),
            overtime_hours=data.get('overtime_hours', 0.0),
            shift=data.get('shift', 'General'),
            remarks=data.get('remarks'),
            user_id=user_id
        )
        return jsonify({'message': 'Attendance marked successfully', 'attendance': att.to_dict()}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@attendance_bp.route('/bulk', methods=['POST'])
@token_required
@role_required('Super Admin', 'HR Manager', 'Payroll Manager')
def bulk_mark_attendance():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    records = data.get('records', [])

    if not records:
        return jsonify({'error': 'No records provided'}), 400

    try:
        count = AttendanceService.bulk_mark_attendance(records, user_id=user_id)
        return jsonify({'message': f"Updated {count} attendance records successfully"}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@attendance_bp.route('/monthly-summary', methods=['GET'])
@token_required
def get_monthly_summary():
    month = request.args.get('month', date.today().month, type=int)
    year = request.args.get('year', date.today().year, type=int)
    dept_id = request.args.get('department_id', type=int)

    _, days_in_month = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, days_in_month)

    emp_query = Employee.query.filter(Employee.is_active == True, Employee.status == 'Active')
    if dept_id:
        emp_query = emp_query.filter(Employee.department_id == dept_id)
    employees = emp_query.all()

    summary_rows = []
    for emp in employees:
        records = Attendance.query.filter(
            Attendance.employee_id == emp.id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()

        p_days = sum(1 for r in records if r.status == 'Present')
        hd_days = sum(1 for r in records if r.status == 'Half Day')
        wo_days = sum(1 for r in records if r.status == 'Weekly Off')
        pl_days = sum(1 for r in records if r.status == 'Paid Leave')
        upl_days = sum(1 for r in records if r.status == 'Unpaid Leave')
        ab_days = sum(1 for r in records if r.status == 'Absent')
        ot_hrs = sum(r.overtime_hours for r in records)

        payable = p_days + (hd_days * 0.5) + wo_days + pl_days

        summary_rows.append({
            'employee_id': emp.id,
            'emp_code': emp.emp_code,
            'full_name': emp.full_name,
            'department': emp.department.department_name if emp.department else 'N/A',
            'wage_type': emp.wage_type,
            'present_days': p_days,
            'half_days': hd_days,
            'weekly_off': wo_days,
            'paid_leave': pl_days,
            'unpaid_leave': upl_days,
            'absent_days': ab_days,
            'payable_days': payable,
            'overtime_hours': ot_hrs
        })

    # Check approval status
    approval = AttendanceApproval.query.filter_by(month=month, year=year, department_id=dept_id).first()

    return jsonify({
        'month': month,
        'year': year,
        'days_in_month': days_in_month,
        'records': summary_rows,
        'is_approved': approval.is_locked if approval else False
    }), 200

@attendance_bp.route('/approve', methods=['POST'])
@token_required
@role_required('Super Admin', 'HR Manager')
def approve_attendance():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    month = data.get('month', date.today().month)
    year = data.get('year', date.today().year)
    dept_id = data.get('department_id')

    try:
        approval = AttendanceService.approve_and_lock_month(
            month=int(month),
            year=int(year),
            department_id=dept_id,
            user_id=user_id,
            notes=data.get('notes')
        )
        return jsonify({'message': f"Attendance for {month}/{year} approved and locked", 'approval': approval.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
