from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.database import db
from app.models.advance import Advance, AdvanceRepayment
from app.services.advance_service import AdvanceService
from app.utils.decorators import token_required, role_required

advance_bp = Blueprint('advances', __name__, url_prefix='/api/advances')

@advance_bp.route('', methods=['GET'])
@token_required
def get_advances():
    status = request.args.get('status')
    emp_id = request.args.get('employee_id', type=int)

    query = Advance.query
    if status:
        query = query.filter(Advance.status == status)
    if emp_id:
        query = query.filter(Advance.employee_id == emp_id)

    advances = query.order_by(Advance.id.desc()).all()
    return jsonify({
        'advances': [a.to_dict() for a in advances],
        'total_outstanding': sum(a.remaining_amount for a in advances if a.status == 'Approved')
    }), 200

@advance_bp.route('', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant', 'HR Manager', 'Payroll Manager')
def issue_advance():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    emp_id = data.get('employee_id')
    amount = data.get('amount')
    installment = data.get('monthly_installment')

    if not emp_id or not amount or not installment:
        return jsonify({'error': 'Employee ID, amount, and monthly installment are required'}), 400

    try:
        adv = AdvanceService.create_advance(
            employee_id=emp_id,
            amount=amount,
            monthly_installment=installment,
            reason=data.get('reason'),
            payment_mode=data.get('payment_mode', 'Cash'),
            user_id=user_id,
            notes=data.get('notes')
        )
        return jsonify({'message': 'Advance issued successfully', 'advance': adv.to_dict()}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@advance_bp.route('/<int:adv_id>/repay', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant')
def direct_repayment(adv_id):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    amount = data.get('amount')

    if not amount:
        return jsonify({'error': 'Repayment amount is required'}), 400

    try:
        rep = AdvanceService.direct_repayment(
            advance_id=adv_id,
            amount=amount,
            payment_mode=data.get('payment_mode', 'Cash'),
            notes=data.get('notes'),
            user_id=user_id
        )
        return jsonify({'message': 'Repayment recorded successfully', 'repayment': rep.to_dict()}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@advance_bp.route('/<int:adv_id>/history', methods=['GET'])
@token_required
def get_advance_history(adv_id):
    adv = Advance.query.get_or_404(adv_id)
    repayments = AdvanceRepayment.query.filter_by(advance_id=adv_id).order_by(AdvanceRepayment.deduction_date.desc()).all()
    return jsonify({
        'advance': adv.to_dict(),
        'repayments': [r.to_dict() for r in repayments]
    }), 200
