from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.database import db
from app.models.payroll import PayrollPeriod, PayrollRecord
from app.services.payroll_engine import PayrollEngine
from app.utils.decorators import token_required, role_required

payroll_bp = Blueprint('payroll', __name__, url_prefix='/api/payroll')

@payroll_bp.route('', methods=['GET'])
@token_required
def get_payroll_periods():
    year = request.args.get('year', type=int)
    query = PayrollPeriod.query
    if year:
        query = query.filter(PayrollPeriod.year == year)
    periods = query.order_by(PayrollPeriod.year.desc(), PayrollPeriod.month.desc()).all()
    return jsonify({'periods': [p.to_dict() for p in periods]}), 200

@payroll_bp.route('/generate', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant', 'Payroll Manager')
def generate_period():
    data = request.get_json() or {}
    month = data.get('month', date.today().month)
    year = data.get('year', date.today().year)
    working_days = data.get('working_days', 26)

    try:
        period = PayrollEngine.get_or_create_period(
            month=int(month),
            year=int(year),
            total_working_days=int(working_days)
        )
        return jsonify({'message': 'Payroll period ready', 'period': period.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@payroll_bp.route('/<int:period_id>', methods=['GET'])
@token_required
def get_payroll_period_details(period_id):
    period = PayrollPeriod.query.get_or_404(period_id)
    dept_id = request.args.get('department_id', type=int)
    wage_type = request.args.get('wage_type')

    records_query = PayrollRecord.query.filter_by(period_id=period_id)
    if wage_type:
        records_query = records_query.filter(PayrollRecord.wage_type == wage_type)
    
    records = records_query.all()
    if dept_id:
        records = [r for r in records if r.employee and r.employee.department_id == dept_id]

    return jsonify({
        'period': period.to_dict(),
        'records': [r.to_dict() for r in records],
        'total_records': len(records)
    }), 200

@payroll_bp.route('/<int:period_id>/calculate', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant', 'Payroll Manager')
def calculate_payroll(period_id):
    user_id = int(get_jwt_identity())
    try:
        period = PayrollEngine.process_payroll_for_period(period_id=period_id, user_id=user_id)
        return jsonify({
            'message': f"Payroll for {period.month}/{period.year} calculated successfully",
            'period': period.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@payroll_bp.route('/<int:period_id>/approve', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant')
def approve_payroll(period_id):
    user_id = int(get_jwt_identity())
    try:
        period = PayrollEngine.approve_payroll(period_id=period_id, user_id=user_id)
        return jsonify({
            'message': f"Payroll for {period.month}/{period.year} approved successfully",
            'period': period.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@payroll_bp.route('/<int:period_id>/lock', methods=['POST'])
@token_required
@role_required('Super Admin')
def lock_payroll(period_id):
    user_id = int(get_jwt_identity())
    try:
        period = PayrollEngine.lock_payroll(period_id=period_id, user_id=user_id)
        return jsonify({
            'message': f"Payroll for {period.month}/{period.year} locked and finalized. Payslips generated.",
            'period': period.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@payroll_bp.route('/records/<int:record_id>', methods=['GET'])
@token_required
def get_record_details(record_id):
    record = PayrollRecord.query.get_or_404(record_id)
    data = record.to_dict()
    data['calculation_snapshot'] = record.get_snapshot()
    return jsonify({'record': data}), 200
