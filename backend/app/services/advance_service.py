from datetime import datetime, timezone, date
from app.database import db
from app.models.advance import Advance, AdvanceRepayment
from app.utils.audit import log_audit

class AdvanceService:

    @staticmethod
    def create_advance(employee_id, amount, monthly_installment, reason=None, payment_mode='Cash', user_id=None, notes=None):
        amount = float(amount)
        installment = float(monthly_installment)
        if amount <= 0 or installment <= 0:
            raise ValueError("Advance amount and monthly installment must be greater than zero")

        adv = Advance(
            employee_id=employee_id,
            request_date=date.today(),
            amount=amount,
            monthly_installment=installment,
            remaining_amount=amount,
            reason=reason,
            payment_mode=payment_mode,
            status='Approved',
            approved_by=user_id,
            approved_at=datetime.now(timezone.utc),
            notes=notes
        )
        db.session.add(adv)
        db.session.commit()

        if user_id:
            log_audit(user_id=user_id, action='ADVANCE_CREATE', entity_type='Advance', entity_id=adv.id, details={'amount': amount, 'emp': employee_id})

        return adv

    @staticmethod
    def direct_repayment(advance_id, amount, payment_mode='Cash', notes=None, user_id=None):
        adv = Advance.query.get(advance_id)
        if not adv:
            raise ValueError("Advance record not found")

        amount = float(amount)
        if amount <= 0:
            raise ValueError("Repayment amount must be positive")
        if amount > adv.remaining_amount:
            raise ValueError(f"Repayment amount {amount} exceeds outstanding balance of {adv.remaining_amount}")

        new_remaining = round(adv.remaining_amount - amount, 2)
        adv.remaining_amount = new_remaining
        if new_remaining == 0.0:
            adv.status = 'Settled'

        rep = AdvanceRepayment(
            advance_id=adv.id,
            deduction_date=date.today(),
            amount=amount,
            remaining_balance_after=new_remaining,
            payment_mode=payment_mode,
            notes=notes
        )
        db.session.add(rep)
        db.session.commit()

        if user_id:
            log_audit(user_id=user_id, action='ADVANCE_REPAYMENT', entity_type='AdvanceRepayment', entity_id=rep.id, details={'amount': amount, 'adv_id': adv.id})

        return rep
