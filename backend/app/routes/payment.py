from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import get_jwt_identity
from app.database import db
from app.models.payroll import SalaryPayment, PayrollRecord, PayrollPeriod
from app.services.payment_service import PaymentService
from app.services.report_service import ReportService
from app.services.payment_gateway import verify_webhook_signature
from app.utils.decorators import token_required, role_required
import os

payment_bp = Blueprint('payments', __name__, url_prefix='/api/payments')

# -------------------------------------------------------------
# 1. Payment Summary & Pending Dues
# -------------------------------------------------------------
@payment_bp.route('/summary', methods=['GET'])
@token_required
def get_payment_summary():
    """
    Returns dashboard and payments center executive summary:
    - Total pending amount
    - Number of employees with pending dues
    - Fully paid employees
    - Partially paid employees
    - Overdue payments
    - Total amount successfully paid this month
    - Gateway details
    """
    summary = PaymentService.get_payment_summary()
    return jsonify({'summary': summary}), 200

@payment_bp.route('/pending', methods=['GET'])
@token_required
def get_pending_payments():
    """
    Fetches all employee salary records with pending/remaining dues.
    Supports filtering by period_id.
    """
    period_id = request.args.get('period_id', type=int)
    pending_records = PaymentService.get_pending_payments(period_id=period_id)
    total_amount = sum(p.get('remaining_amount', 0.0) for p in pending_records)
    
    return jsonify({
        'pending_payments': pending_records,
        'count': len(pending_records),
        'total_pending_amount': round(total_amount, 2)
    }), 200

# -------------------------------------------------------------
# 2. Payout Execution (One-Tap Bulk & Individual)
# -------------------------------------------------------------
@payment_bp.route('/bulk-initiate', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant', 'HR Manager')
def bulk_initiate_payments():
    """
    One-Tap Bulk Payout settlement.
    Processes each employee payment independently.
    Never marks batch successful if some fail.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    payment_ids = data.get('payment_ids', [])
    payment_mode = data.get('payment_mode', 'Bank Transfer')
    idempotency_prefix = data.get('idempotency_prefix')

    if not payment_ids:
        return jsonify({'error': 'No payment IDs provided for payout settlement'}), 400

    try:
        result = PaymentService.bulk_initiate_payments(
            payment_ids=payment_ids,
            payment_mode=payment_mode,
            idempotency_prefix=idempotency_prefix,
            user_id=user_id
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Payout batch execution failed', 'details': str(e)}), 500

@payment_bp.route('/<int:payment_id>/initiate', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant', 'HR Manager')
def initiate_single_payment(payment_id):
    """
    Initiates payment settlement for an individual employee.
    Supports full payment, partial payment, and recalculates remaining balance.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    amount = data.get('amount')
    payment_mode = data.get('payment_mode', 'Bank Transfer')
    idempotency_key = data.get('idempotency_key')
    notes = data.get('notes')

    try:
        result = PaymentService.initiate_single_payment(
            payment_id=payment_id,
            amount=amount,
            payment_mode=payment_mode,
            idempotency_key=idempotency_key,
            user_id=user_id,
            notes=notes
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Payment initiation failed', 'details': str(e)}), 500

# -------------------------------------------------------------
# 3. Transaction History, Receipt & Status Inquiry
# -------------------------------------------------------------
@payment_bp.route('/history', methods=['GET'])
@token_required
def get_payment_history():
    """
    Retrieves detailed transaction history with filtering across:
    employee_id, period_id, status, payment_mode, and search text.
    """
    filters = {
        'employee_id': request.args.get('employee_id', type=int),
        'period_id': request.args.get('period_id', type=int),
        'status': request.args.get('status'),
        'payment_mode': request.args.get('payment_mode'),
        'search': request.args.get('search', '').strip()
    }
    history = PaymentService.get_payment_history(filters=filters)
    return jsonify({
        'history': history,
        'total': len(history)
    }), 200

@payment_bp.route('/<int:payment_id>/status', methods=['GET'])
@token_required
def get_payment_status(payment_id):
    """
    Queries current status of payment and initiates verification for in-flight transactions.
    """
    try:
        data = PaymentService.check_payment_status(payment_id)
        return jsonify(data), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@payment_bp.route('/receipt/<int:transaction_id>', methods=['GET'])
@token_required
def get_payment_receipt(transaction_id):
    """
    Returns printable/exportable receipt data for a confirmed salary payout transaction.
    """
    try:
        receipt = PaymentService.get_payment_receipt_data(transaction_id)
        return jsonify({'receipt': receipt}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@payment_bp.route('/reconciliation', methods=['GET'])
@token_required
def get_reconciliation_summary():
    """
    Returns aggregate reconciliation figures, settlement rate, and discrepancy counts.
    """
    period_id = request.args.get('period_id', type=int)
    recon = PaymentService.get_reconciliation_summary(period_id=period_id)
    return jsonify({'reconciliation': recon}), 200

# -------------------------------------------------------------
# 4. Bank Provider Webhook
# -------------------------------------------------------------
@payment_bp.route('/webhook', methods=['POST'])
def handle_provider_webhook():
    """
    Asynchronous settlement callback endpoint from bank rails or payment gateway.
    Verifies provider signature and updates settlement state.
    """
    payload = request.get_json(silent=True) or {}
    signature = request.headers.get('X-Provider-Signature') or request.headers.get('X-Razorpay-Signature')
    secret = os.environ.get('PAYMENT_WEBHOOK_SECRET', '')

    if secret and not verify_webhook_signature(request.get_data(), signature, secret):
        return jsonify({'error': 'Invalid webhook signature'}), 401

    try:
        res = PaymentService.process_webhook(payload, signature=signature)
        return jsonify(res), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Webhook processing error', 'details': str(e)}), 500

# -------------------------------------------------------------
# 5. Salary Register & Legacy Batch Operations
# -------------------------------------------------------------
@payment_bp.route('', methods=['GET'])
@token_required
def get_payments():
    period_id = request.args.get('period_id', type=int)
    status = request.args.get('status')
    mode = request.args.get('payment_mode')

    query = SalaryPayment.query.join(PayrollRecord)
    if period_id:
        query = query.filter(PayrollRecord.period_id == period_id)
    if status:
        query = query.filter(SalaryPayment.status == status)
    if mode:
        query = query.filter(SalaryPayment.payment_mode == mode)

    payments = query.order_by(SalaryPayment.id.desc()).all()

    results = []
    total_amount = 0.0
    paid_amount = 0.0
    pending_amount = 0.0

    for p in payments:
        p_dict = p.to_dict()
        rem = p_dict['remaining_amount']
        total_amount += p.amount
        paid_amount += (p.paid_amount or 0.0)
        pending_amount += rem

        results.append(p_dict)

    return jsonify({
        'payments': results,
        'summary': {
            'total_records': len(results),
            'total_amount': round(total_amount, 2),
            'paid_amount': round(paid_amount, 2),
            'pending_amount': round(pending_amount, 2)
        }
    }), 200

@payment_bp.route('/<int:payment_id>', methods=['PUT'])
@token_required
@role_required('Super Admin', 'Accountant')
def update_payment(payment_id):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    try:
        payment = PaymentService.update_payment_status(
            payment_id=payment_id,
            status=data.get('status', 'Paid'),
            payment_mode=data.get('payment_mode'),
            transaction_ref=data.get('transaction_ref'),
            payment_date=data.get('payment_date'),
            notes=data.get('notes'),
            user_id=user_id
        )
        return jsonify({'message': 'Payment record updated successfully', 'payment': payment.to_dict()}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@payment_bp.route('/reconcile-batch', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant')
def reconcile_batch():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    payment_ids = data.get('payment_ids', [])
    ref_prefix = data.get('transaction_prefix', 'TXN-BANK')
    mode = data.get('payment_mode', 'Bank Transfer')
    stmt_ref = data.get('bank_statement_ref')

    if not payment_ids:
        return jsonify({'error': 'No payment IDs provided'}), 400

    count = PaymentService.reconcile_batch(
        payment_ids=payment_ids,
        transaction_prefix=ref_prefix,
        payment_mode=mode,
        bank_statement_ref=stmt_ref,
        user_id=user_id
    )

    return jsonify({'message': f"Reconciled {count} payments successfully"}), 200

@payment_bp.route('/export/bank-statement/<int:period_id>', methods=['GET'])
@token_required
def export_bank_statement(period_id):
    csv_data = ReportService.export_bank_transfer_csv(period_id)
    return Response(
        csv_data,
        mimetype='text/csv',
        headers={"Content-Disposition": f"attachment;filename=bank_transfer_statement_period_{period_id}.csv"}
    )
