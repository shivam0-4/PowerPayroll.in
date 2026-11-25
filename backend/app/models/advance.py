from datetime import datetime, timezone, date
from app.database import db

class Advance(db.Model):
    __tablename__ = 'advances'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    request_date = db.Column(db.Date, nullable=False, default=date.today)
    amount = db.Column(db.Float, nullable=False)
    monthly_installment = db.Column(db.Float, nullable=False)
    remaining_amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(255))
    payment_mode = db.Column(db.String(30), default='Cash') # Cash, Bank Transfer, UPI
    status = db.Column(db.String(30), default='Approved', index=True) # Pending, Approved, Rejected, Settled
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    employee = db.relationship('Employee', back_populates='advances')
    repayments = db.relationship('AdvanceRepayment', back_populates='advance', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else None,
            'emp_code': self.employee.emp_code if self.employee else None,
            'department_name': self.employee.department.department_name if (self.employee and self.employee.department) else None,
            'request_date': self.request_date.isoformat() if self.request_date else None,
            'amount': self.amount,
            'monthly_installment': self.monthly_installment,
            'remaining_amount': self.remaining_amount,
            'reason': self.reason,
            'payment_mode': self.payment_mode,
            'status': self.status,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'notes': self.notes
        }

class AdvanceRepayment(db.Model):
    __tablename__ = 'advance_repayments'

    id = db.Column(db.Integer, primary_key=True)
    advance_id = db.Column(db.Integer, db.ForeignKey('advances.id', ondelete='CASCADE'), nullable=False, index=True)
    payroll_record_id = db.Column(db.Integer, db.ForeignKey('payroll_records.id', ondelete='SET NULL'), nullable=True, index=True)
    deduction_date = db.Column(db.Date, nullable=False, default=date.today)
    amount = db.Column(db.Float, nullable=False)
    remaining_balance_after = db.Column(db.Float, nullable=False)
    payment_mode = db.Column(db.String(50), default='Payroll Deduction') # Payroll Deduction, Cash, Bank Transfer
    notes = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    advance = db.relationship('Advance', back_populates='repayments')
    payroll_record = db.relationship('PayrollRecord')

    def to_dict(self):
        return {
            'id': self.id,
            'advance_id': self.advance_id,
            'payroll_record_id': self.payroll_record_id,
            'deduction_date': self.deduction_date.isoformat() if self.deduction_date else None,
            'amount': self.amount,
            'remaining_balance_after': self.remaining_balance_after,
            'payment_mode': self.payment_mode,
            'notes': self.notes
        }
