import json
import uuid
from datetime import datetime, timezone, date
from app.database import db
from app.models.payroll import SalaryPayment, PaymentTransaction, PayrollRecord, PayrollPeriod
from app.models.company import Company
from app.services.payment_gateway import PaymentGatewayFactory, GatewayResponse
from app.utils.audit import log_audit
from app.utils.helpers import number_to_indian_words, mask_sensitive

class PaymentService:

    @staticmethod
    def get_payment_summary():
        """
        Calculates executive summary metrics for Dashboard and Payments Center:
        - Total pending amount
        - Number of employees with pending dues
        - Fully paid employees
        - Partially paid employees
        - Overdue payments
        - Total amount successfully paid this month
        - Gateway config info
        """
        all_payments = SalaryPayment.query.join(PayrollRecord).all()
        now = datetime.now(timezone.utc)
        current_month = now.month
        current_year = now.year

        total_pending_amount = 0.0
        pending_employees_count = 0
        fully_paid_count = 0
        partially_paid_count = 0
        overdue_count = 0
        total_paid_this_month = 0.0

        for p in all_payments:
            rec = p.payroll_record
            period = rec.payroll_period if rec else None
            rem = p.remaining_amount if p.remaining_amount is not None else max(0.0, p.amount - (p.paid_amount or 0.0))

            # Status normalization
            st = (p.status or 'UNPAID').upper()
            if st in ['UNPAID', 'PENDING', 'FAILED', 'PARTIALLY_PAID', 'PAYMENT_PROCESSING'] and rem > 0.001:
                total_pending_amount += rem
                pending_employees_count += 1

                # If from a prior month or period, classify as overdue
                if period and (period.year < current_year or (period.year == current_year and period.month < current_month)):
                    overdue_count += 1

            if st == 'PAID' or rem <= 0.001:
                fully_paid_count += 1
            elif st == 'PARTIALLY_PAID':
                partially_paid_count += 1

            # Sum transactions paid this current month
            for tx in p.transactions:
                if (tx.status or '').upper() == 'PAID' and tx.confirmed_at:
                    if tx.confirmed_at.month == current_month and tx.confirmed_at.year == current_year:
                        total_paid_this_month += tx.amount

        # If no individual transaction dates exist, fallback to reconciled payment dates this month
        if total_paid_this_month == 0.0:
            for p in all_payments:
                if (p.status or '').upper() == 'PAID' and p.payment_date:
                    if p.payment_date.month == current_month and p.payment_date.year == current_year:
                        total_paid_this_month += (p.paid_amount or p.amount)

        return {
            'total_pending_amount': round(total_pending_amount, 2),
            'pending_employees_count': pending_employees_count,
            'fully_paid_count': fully_paid_count,
            'partially_paid_count': partially_paid_count,
            'overdue_count': overdue_count,
            'total_paid_this_month': round(total_paid_this_month, 2),
            'total_records': len(all_payments),
            'gateway_info': PaymentGatewayFactory.get_gateway_info()
        }

    @staticmethod
    def get_pending_payments(period_id=None):
        """
        Retrieves all employee salary records that have remaining dues.
        """
        query = SalaryPayment.query.join(PayrollRecord)
        if period_id:
            query = query.filter(PayrollRecord.period_id == period_id)

        all_payments = query.all()
        pending_list = []
        for p in all_payments:
            rem = p.remaining_amount if p.remaining_amount is not None else max(0.0, p.amount - (p.paid_amount or 0.0))
            # Also compute from amount if remaining_amount is 0 but paid_amount is also 0 (legacy records)
            if rem <= 0.001 and p.amount > 0.001 and (p.paid_amount or 0.0) <= 0.001:
                rem = p.amount
            st = (p.status or 'UNPAID').upper()
            if rem > 0.001 and st != 'PAID':
                pending_list.append(p.to_dict())

        return pending_list

    @staticmethod
    def initiate_single_payment(payment_id, amount=None, payment_mode='Bank Transfer', idempotency_key=None, user_id=None, notes=None):
        """
        Executes a verified salary payment settlement for a single employee.
        Supports full payment or partial payment with remaining balance recalculation.
        Multiple payment transactions for the same salary period are supported.
        CRITICAL: Never marks payment as PAID without verified gateway confirmation.
        """
        payment = SalaryPayment.query.get(payment_id)
        if not payment:
            raise ValueError(f"Salary payment record #{payment_id} not found")

        rec = payment.payroll_record
        emp = rec.employee if rec else None
        if not emp:
            raise ValueError("Employee details missing for payment record")

        # Determine remaining dues
        current_rem = payment.remaining_amount if payment.remaining_amount is not None else max(0.0, payment.amount - (payment.paid_amount or 0.0))
        # Handle legacy payments where remaining_amount=0 but paid_amount=0 (re-compute from amount)
        if current_rem <= 0.001 and payment.amount > 0.001 and (payment.paid_amount or 0.0) <= 0.001:
            current_rem = payment.amount
        st = (payment.status or 'UNPAID').upper()
        if current_rem <= 0.001 or st == 'PAID':
            raise ValueError(f"Employee {emp.full_name} has already been fully paid.")

        # Payment amount validation
        payable_amount = round(float(amount if amount is not None else current_rem), 2)
        if payable_amount <= 0:
            raise ValueError("Payment amount must be greater than zero")
        if payable_amount > round(current_rem + 0.01, 2):
            raise ValueError(f"Amount ₹{payable_amount:,.2f} exceeds remaining dues of ₹{current_rem:,.2f}")

        # Idempotency check to prevent duplicate payments
        if not idempotency_key:
            idempotency_key = f"IDEMP-{payment.id}-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"

        existing_tx = PaymentTransaction.query.filter_by(idempotency_key=idempotency_key).first()
        if existing_tx and existing_tx.status == 'PAID':
            return {
                'status': 'ALREADY_PROCESSED',
                'message': 'Payment already processed with this idempotency key',
                'transaction': existing_tx.to_dict(),
                'payment': payment.to_dict()
            }

        # Dispatch via Payment Gateway
        gateway = PaymentGatewayFactory.get_gateway()
        gw_response: GatewayResponse = gateway.initiate_payout(
            account_number=emp.bank_account_no,
            ifsc=emp.bank_ifsc,
            amount=payable_amount,
            beneficiary_name=emp.full_name,
            idempotency_key=idempotency_key,
            payment_mode=payment_mode
        )

        now_utc = datetime.now(timezone.utc)

        # Create immutable transaction record
        tx = PaymentTransaction(
            salary_payment_id=payment.id,
            transaction_ref=gw_response.transaction_ref,
            idempotency_key=idempotency_key,
            amount=payable_amount,
            payment_mode=payment_mode,
            status=gw_response.status,
            provider=gw_response.provider_response.get('provider', 'BANK_GATEWAY'),
            provider_tx_id=gw_response.provider_tx_id,
            provider_response=json.dumps(gw_response.provider_response),
            failure_reason=gw_response.failure_reason,
            initiated_by=user_id,
            initiated_at=now_utc,
            confirmed_at=now_utc if gw_response.status == 'PAID' else None,
            notes=notes
        )
        db.session.add(tx)

        # Update SalaryPayment parent state based on verified provider response
        if gw_response.status == 'PAID':
            payment.paid_amount = round((payment.paid_amount or 0.0) + payable_amount, 2)
            payment.remaining_amount = round(max(0.0, payment.amount - payment.paid_amount), 2)
            payment.payment_mode = payment_mode
            payment.transaction_ref = gw_response.transaction_ref
            payment.payment_date = date.today()
            payment.reconciled_by = user_id
            payment.reconciled_at = now_utc

            if payment.remaining_amount <= 0.001:
                payment.status = 'PAID'
                if rec:
                    rec.status = 'Paid'
            else:
                payment.status = 'PARTIALLY_PAID'

        elif gw_response.status == 'PAYMENT_PROCESSING':
            payment.status = 'PAYMENT_PROCESSING'
        else:
            # Payment failed at gateway
            if not payment.paid_amount or payment.paid_amount == 0.0:
                payment.status = 'FAILED'
            payment.notes = f"Payment attempt failed: {gw_response.failure_reason}"

        db.session.commit()

        if user_id:
            log_audit(
                user_id=user_id,
                action='PAYMENT_INITIATE',
                entity_type='SalaryPayment',
                entity_id=payment.id,
                details={
                    'amount': payable_amount,
                    'status': gw_response.status,
                    'utr': gw_response.transaction_ref,
                    'mode': payment_mode,
                    'emp_code': emp.emp_code
                }
            )

        return {
            'success': gw_response.success,
            'status': gw_response.status,
            'amount_paid': payable_amount,
            'remaining_balance': payment.remaining_amount,
            'transaction_ref': gw_response.transaction_ref,
            'failure_reason': gw_response.failure_reason,
            'payment': payment.to_dict(),
            'transaction': tx.to_dict()
        }

    @staticmethod
    def bulk_initiate_payments(payment_ids, payment_mode='Bank Transfer', idempotency_prefix=None, user_id=None):
        """
        One-Tap Payout for multiple employees.
        CRITICAL BUSINESS RULE:
        A salary payment must be considered complete only when the payment provider confirms settlement.
        Process each payment INDEPENDENTLY.
        If a bulk payment contains 20 employees and 18 succeed while 2 fail,
        update each employee's payment status independently. Never treat the entire batch as successful.
        """
        if not payment_ids:
            raise ValueError("No payment IDs provided for bulk payout")

        if not idempotency_prefix:
            idempotency_prefix = f"BATCH-{int(datetime.now(timezone.utc).timestamp())}"

        results = []
        successful_count = 0
        failed_count = 0
        processing_count = 0
        total_settled = 0.0

        for pid in payment_ids:
            payment = SalaryPayment.query.get(pid)
            if not payment:
                continue

            emp = payment.payroll_record.employee if payment.payroll_record else None
            emp_name = emp.full_name if emp else 'Unknown'
            emp_code = emp.emp_code if emp else str(pid)

            rem = payment.remaining_amount if payment.remaining_amount is not None else max(0.0, payment.amount - (payment.paid_amount or 0.0))
            if rem <= 0.001 or (payment.status or '').upper() == 'PAID':
                results.append({
                    'payment_id': payment.id,
                    'employee_name': emp_name,
                    'emp_code': emp_code,
                    'amount': 0.0,
                    'status': 'PAID',
                    'transaction_ref': payment.transaction_ref,
                    'failure_reason': 'Already fully settled'
                })
                continue

            item_idemp = f"{idempotency_prefix}-PAY-{payment.id}"

            try:
                # Process individual item inside isolated try-catch with independent commit
                res = PaymentService.initiate_single_payment(
                    payment_id=payment.id,
                    amount=rem, # Settle all remaining dues
                    payment_mode=payment_mode,
                    idempotency_key=item_idemp,
                    user_id=user_id,
                    notes=f"Batch payout: {idempotency_prefix}"
                )

                if res['status'] == 'PAID':
                    successful_count += 1
                    total_settled += res['amount_paid']
                elif res['status'] == 'PAYMENT_PROCESSING':
                    processing_count += 1
                else:
                    failed_count += 1

                results.append({
                    'payment_id': payment.id,
                    'employee_name': emp_name,
                    'emp_code': emp_code,
                    'amount': res['amount_paid'],
                    'remaining_amount': res['remaining_balance'],
                    'status': res['status'],
                    'transaction_ref': res['transaction_ref'],
                    'failure_reason': res.get('failure_reason')
                })

            except Exception as e:
                db.session.rollback()
                failed_count += 1
                results.append({
                    'payment_id': payment.id,
                    'employee_name': emp_name,
                    'emp_code': emp_code,
                    'amount': rem,
                    'status': 'FAILED',
                    'transaction_ref': None,
                    'failure_reason': str(e)
                })

        return {
            'total_requested': len(payment_ids),
            'successful_count': successful_count,
            'failed_count': failed_count,
            'processing_count': processing_count,
            'total_settled_amount': round(total_settled, 2),
            'results': results,
            'gateway_info': PaymentGatewayFactory.get_gateway_info()
        }

    @staticmethod
    def check_payment_status(payment_id):
        """
        Retrieves status of a payment and its transactions.
        If a transaction is currently PAYMENT_PROCESSING, probes provider for verified status.
        """
        payment = SalaryPayment.query.get(payment_id)
        if not payment:
            raise ValueError(f"Salary payment #{payment_id} not found")

        # Proactively check processing transactions
        if payment.transactions:
            latest_tx = payment.transactions[0]
            if latest_tx.status == 'PAYMENT_PROCESSING' and latest_tx.provider_tx_id:
                try:
                    gateway = PaymentGatewayFactory.get_gateway()
                    verify_res = gateway.verify_payout(latest_tx.provider_tx_id)
                    if verify_res.status == 'PAID':
                        now_utc = datetime.now(timezone.utc)
                        latest_tx.status = 'PAID'
                        latest_tx.confirmed_at = now_utc
                        if verify_res.transaction_ref:
                            latest_tx.transaction_ref = verify_res.transaction_ref

                        payment.paid_amount = round((payment.paid_amount or 0.0) + latest_tx.amount, 2)
                        payment.remaining_amount = round(max(0.0, payment.amount - payment.paid_amount), 2)
                        if payment.remaining_amount <= 0.001:
                            payment.status = 'PAID'
                            if payment.payroll_record:
                                payment.payroll_record.status = 'Paid'
                        else:
                            payment.status = 'PARTIALLY_PAID'
                        db.session.commit()
                except Exception:
                    pass

        return {
            'payment': payment.to_dict(),
            'transactions': [t.to_dict() for t in payment.transactions]
        }

    @staticmethod
    def process_webhook(payload, signature=None):
        """
        Asynchronous webhook settlement handler from corporate payment providers.
        Updates transaction and parent salary payment atomically.
        """
        event = payload.get('event') or payload.get('status')
        provider_tx_id = payload.get('payout_id') or payload.get('provider_tx_id') or payload.get('id')
        utr = payload.get('utr') or payload.get('transaction_ref')
        idemp_key = payload.get('idempotency_key')

        tx = None
        if provider_tx_id:
            tx = PaymentTransaction.query.filter_by(provider_tx_id=provider_tx_id).first()
        if not tx and idemp_key:
            tx = PaymentTransaction.query.filter_by(idempotency_key=idemp_key).first()
        if not tx and utr:
            tx = PaymentTransaction.query.filter_by(transaction_ref=utr).first()

        if not tx:
            raise ValueError(f"Transaction not found for provider reference: {provider_tx_id or utr or idemp_key}")

        payment = tx.salary_payment
        now_utc = datetime.now(timezone.utc)
        event_str = str(event).upper()

        if event_str in ['SETTLED', 'SUCCESS', 'PROCESSED', 'PAID']:
            if tx.status != 'PAID':
                tx.status = 'PAID'
                tx.confirmed_at = now_utc
                if utr:
                    tx.transaction_ref = utr

                payment.paid_amount = round((payment.paid_amount or 0.0) + tx.amount, 2)
                payment.remaining_amount = round(max(0.0, payment.amount - payment.paid_amount), 2)
                if payment.remaining_amount <= 0.001:
                    payment.status = 'PAID'
                    if payment.payroll_record:
                        payment.payroll_record.status = 'Paid'
                else:
                    payment.status = 'PARTIALLY_PAID'

        elif event_str in ['FAILED', 'REJECTED']:
            tx.status = 'FAILED'
            tx.failure_reason = payload.get('failure_reason') or payload.get('reason') or 'Bank clearing rejected transaction'
            if not payment.paid_amount or payment.paid_amount <= 0.0:
                payment.status = 'FAILED'

        elif event_str in ['REFUNDED', 'REVERSED']:
            if tx.status == 'PAID':
                payment.paid_amount = round(max(0.0, (payment.paid_amount or 0.0) - tx.amount), 2)
                payment.remaining_amount = round(payment.amount - payment.paid_amount, 2)
            tx.status = 'REFUNDED'
            payment.status = 'REFUNDED' if payment.paid_amount <= 0.001 else 'PARTIALLY_PAID'

        tx.provider_response = json.dumps(payload)
        db.session.commit()

        log_audit(
            user_id=None,
            action='PAYMENT_WEBHOOK_UPDATE',
            entity_type='PaymentTransaction',
            entity_id=tx.id,
            details={'event': event, 'status': tx.status, 'provider_tx_id': provider_tx_id}
        )

        return {
            'processed': True,
            'transaction_id': tx.id,
            'status': tx.status,
            'payment_status': payment.status,
            'remaining_balance': payment.remaining_amount
        }

    @staticmethod
    def get_reconciliation_summary(period_id=None):
        """
        Provides comprehensive reconciliation analytics across salary periods.
        """
        query = SalaryPayment.query.join(PayrollRecord)
        if period_id:
            query = query.filter(PayrollRecord.period_id == period_id)
        payments = query.all()

        total_payable = sum(p.amount for p in payments)
        total_settled = sum(p.paid_amount or 0.0 for p in payments)
        total_pending = sum(
            p.remaining_amount if p.remaining_amount is not None else max(0.0, p.amount - (p.paid_amount or 0.0))
            for p in payments
        )

        all_tx_query = PaymentTransaction.query.join(SalaryPayment).join(PayrollRecord)
        if period_id:
            all_tx_query = all_tx_query.filter(PayrollRecord.period_id == period_id)
        all_txs = all_tx_query.all()

        paid_txs = [t for t in all_txs if t.status == 'PAID']
        failed_txs = [t for t in all_txs if t.status == 'FAILED']
        processing_txs = [t for t in all_txs if t.status == 'PAYMENT_PROCESSING']

        settlement_rate = round((total_settled / total_payable * 100), 2) if total_payable > 0 else 0.0

        return {
            'total_salary_payable': round(total_payable, 2),
            'total_settled_amount': round(total_settled, 2),
            'total_pending_dues': round(total_pending, 2),
            'settlement_rate_percent': settlement_rate,
            'total_payments_count': len(payments),
            'total_transactions_count': len(all_txs),
            'paid_transactions_count': len(paid_txs),
            'failed_transactions_count': len(failed_txs),
            'processing_transactions_count': len(processing_txs),
            'gateway_info': PaymentGatewayFactory.get_gateway_info()
        }

    @staticmethod
    def get_payment_history(filters=None):
        """
        Retrieves detailed transaction history with filtering across employee, month, date, and status.
        """
        filters = filters or {}
        query = PaymentTransaction.query.join(SalaryPayment).join(PayrollRecord)

        if filters.get('employee_id'):
            query = query.filter(PayrollRecord.employee_id == filters['employee_id'])

        if filters.get('period_id'):
            query = query.filter(PayrollRecord.period_id == filters['period_id'])

        if filters.get('status'):
            query = query.filter(PaymentTransaction.status == filters['status'])

        if filters.get('payment_mode'):
            query = query.filter(PaymentTransaction.payment_mode == filters['payment_mode'])

        if filters.get('search'):
            s = f"%{filters['search']}%"
            query = query.join(PayrollRecord.employee).filter(
                (PaymentTransaction.transaction_ref.ilike(s)) |
                (PayrollRecord.employee.has(full_name=s)) |
                (PayrollRecord.employee.has(emp_code=s))
            )

        transactions = query.order_by(PaymentTransaction.id.desc()).all()
        return [t.to_dict() for t in transactions]

    @staticmethod
    def get_payment_receipt_data(transaction_id):
        """
        Generates official printable receipt data for an individual confirmed payout transaction.
        """
        tx = PaymentTransaction.query.get(transaction_id)
        if not tx:
            raise ValueError(f"Payment transaction #{transaction_id} not found")

        payment = tx.salary_payment
        rec = payment.payroll_record
        emp = rec.employee if rec else None
        period = rec.payroll_period if rec else None
        comp = Company.query.first()

        return {
            'receipt_number': f"RCP-{tx.id:06d}",
            'transaction_id': tx.id,
            'transaction_ref': tx.transaction_ref,
            'provider_tx_id': tx.provider_tx_id,
            'amount': tx.amount,
            'amount_in_words': number_to_indian_words(tx.amount),
            'payment_mode': tx.payment_mode,
            'status': tx.status,
            'payment_date': (tx.confirmed_at or tx.initiated_at).strftime('%d %B %Y %H:%M:%S UTC'),
            'company': {
                'name': comp.name if comp else 'GROUPON POWER INFRA & LABOUR LTD',
                'address': comp.registered_address if comp else 'Industrial Estate, Sanand, Gujarat',
                'gst_no': comp.gst_no if comp else '',
                'pan_no': comp.pan_no if comp else '',
                'pf_code': comp.pf_establishment_code if comp else '',
                'esic_code': comp.esic_employer_code if comp else ''
            },
            'employee': {
                'id': emp.id if emp else None,
                'emp_code': emp.emp_code if emp else '',
                'full_name': emp.full_name if emp else '',
                'department': emp.department.department_name if (emp and emp.department) else 'N/A',
                'designation': emp.designation if emp else 'Staff',
                'bank_name': emp.bank_name if emp else 'N/A',
                'bank_account_masked': mask_sensitive(emp.bank_account_no, 4) if emp else 'N/A',
                'bank_ifsc': emp.bank_ifsc if emp else 'N/A'
            },
            'payroll_details': {
                'period_label': period.to_dict()['period_label'] if period else '',
                'salary_month': f"{period.month:02d}/{period.year}" if period else '',
                'net_payable_salary': payment.amount,
                'total_paid_so_far': payment.paid_amount,
                'remaining_balance': payment.remaining_amount
            },
            'settled_by': tx.initiator.full_name if tx.initiator else 'System Administrator'
        }

    @staticmethod
    def update_payment_status(payment_id, status='PAID', payment_mode=None, transaction_ref=None, payment_date=None, notes=None, user_id=None):
        """
        Manual reconciliation update endpoint for legacy/accounting workflows.
        """
        payment = SalaryPayment.query.get(payment_id)
        if not payment:
            raise ValueError(f"Salary payment record #{payment_id} not found")

        # Normalize status
        status_map = {
            'paid': 'PAID',
            'pending': 'UNPAID',
            'processing': 'PAYMENT_PROCESSING',
            'failed': 'FAILED',
            'partially_paid': 'PARTIALLY_PAID',
            'refunded': 'REFUNDED'
        }
        normalized_status = status_map.get(status.lower(), status.upper())

        payment.status = normalized_status
        if payment_mode:
            payment.payment_mode = payment_mode
        if transaction_ref:
            payment.transaction_ref = transaction_ref
        if payment_date:
            if isinstance(payment_date, str):
                payment.payment_date = datetime.strptime(payment_date, '%Y-%m-%d').date()
            else:
                payment.payment_date = payment_date
        if notes:
            payment.notes = notes

        if normalized_status == 'PAID':
            payment.paid_amount = payment.amount
            payment.remaining_amount = 0.0
            if payment.payroll_record:
                payment.payroll_record.status = 'Paid'

        payment.reconciled_by = user_id
        payment.reconciled_at = datetime.now(timezone.utc)
        db.session.commit()

        if user_id:
            log_audit(
                user_id=user_id,
                action='PAYMENT_MANUAL_UPDATE',
                entity_type='SalaryPayment',
                entity_id=payment.id,
                details={'status': normalized_status, 'ref': transaction_ref}
            )

        return payment

    @staticmethod
    def reconcile_batch(payment_ids, transaction_prefix='TXN-BANK', payment_mode='Bank Transfer', bank_statement_ref=None, user_id=None):
        """
        Batch marks payments as reconciled from a confirmed bank statement file.
        """
        count = 0
        now_utc = datetime.now(timezone.utc)

        for pid in payment_ids:
            payment = SalaryPayment.query.get(pid)
            if not payment:
                continue

            ref = f"{transaction_prefix}-{pid}-{int(now_utc.timestamp())}"
            payment.status = 'PAID'
            payment.payment_mode = payment_mode
            payment.transaction_ref = ref
            payment.payment_date = date.today()
            payment.paid_amount = payment.amount
            payment.remaining_amount = 0.0
            payment.reconciled_by = user_id
            payment.reconciled_at = now_utc
            payment.bank_statement_ref = bank_statement_ref

            if payment.payroll_record:
                payment.payroll_record.status = 'Paid'

            # Also create corresponding transaction
            tx = PaymentTransaction(
                salary_payment_id=payment.id,
                transaction_ref=ref,
                idempotency_key=f"RECON-{payment.id}-{now_utc.timestamp()}",
                amount=payment.amount,
                payment_mode=payment_mode,
                status='PAID',
                provider='BANK_STATEMENT_RECONCILIATION',
                provider_tx_id=bank_statement_ref or ref,
                initiated_by=user_id,
                initiated_at=now_utc,
                confirmed_at=now_utc,
                notes=f"Reconciled via bank statement {bank_statement_ref or ''}"
            )
            db.session.add(tx)
            count += 1

        db.session.commit()
        return count
