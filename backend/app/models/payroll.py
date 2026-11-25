from datetime import datetime, timezone, date
import json
from app.database import db

class PayrollPeriod(db.Model):
    __tablename__ = 'payroll_periods'
    __table_args__ = (
        db.UniqueConstraint('month', 'year', name='uq_payroll_period_month_year'),
    )

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Integer, nullable=False, index=True) # 1 - 12
    year = db.Column(db.Integer, nullable=False, index=True)  # e.g. 2026
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    total_working_days = db.Column(db.Integer, default=26)
    
    # Status: Draft, Calculated, Pending Approval, Approved, Locked
    status = db.Column(db.String(30), default='Draft', index=True)
    processed_at = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime)
    locked_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    locked_at = db.Column(db.DateTime)
    
    total_gross = db.Column(db.Float, default=0.0)
    total_deductions = db.Column(db.Float, default=0.0)
    total_net = db.Column(db.Float, default=0.0)
    employee_count = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    records = db.relationship('PayrollRecord', back_populates='payroll_period', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'month': self.month,
            'year': self.year,
            'period_label': f"{date(self.year, self.month, 1).strftime('%B %Y')}",
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'total_working_days': self.total_working_days,
            'status': self.status,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'locked_at': self.locked_at.isoformat() if self.locked_at else None,
            'total_gross': self.total_gross,
            'total_deductions': self.total_deductions,
            'total_net': self.total_net,
            'employee_count': self.employee_count,
            'notes': self.notes
        }

class PayrollRecord(db.Model):
    __tablename__ = 'payroll_records'
    __table_args__ = (
        db.UniqueConstraint('period_id', 'employee_id', name='uq_payroll_period_employee'),
    )

    id = db.Column(db.Integer, primary_key=True)
    period_id = db.Column(db.Integer, db.ForeignKey('payroll_periods.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    
    wage_type = db.Column(db.String(30), nullable=False) # daily_wage, monthly_salary
    base_rate = db.Column(db.Float, default=0.0) # daily rate or monthly salary
    total_month_days = db.Column(db.Float, default=30.0)
    payable_days = db.Column(db.Float, default=0.0)
    present_days = db.Column(db.Float, default=0.0)
    absent_days = db.Column(db.Float, default=0.0)
    half_days = db.Column(db.Float, default=0.0)
    paid_leaves = db.Column(db.Float, default=0.0)
    unpaid_leaves = db.Column(db.Float, default=0.0)
    overtime_hours = db.Column(db.Float, default=0.0)
    overtime_amount = db.Column(db.Float, default=0.0)
    
    gross_earnings = db.Column(db.Float, default=0.0)
    total_deductions = db.Column(db.Float, default=0.0)
    net_salary = db.Column(db.Float, default=0.0)
    
    status = db.Column(db.String(30), default='Calculated', index=True) # Calculated, Approved, Locked, Paid
    calculation_snapshot = db.Column(db.Text) # Complete JSON of inputs, rules, breakdown
    review_flag = db.Column(db.Boolean, default=False)
    review_notes = db.Column(db.String(255))
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    payroll_period = db.relationship('PayrollPeriod', back_populates='records')
    employee = db.relationship('Employee', back_populates='payroll_records')
    earnings = db.relationship('PayrollEarning', back_populates='payroll_record', cascade='all, delete-orphan')
    deductions = db.relationship('PayrollDeduction', back_populates='payroll_record', cascade='all, delete-orphan')
    payslip = db.relationship('Payslip', back_populates='payroll_record', uselist=False, cascade='all, delete-orphan')
    payment = db.relationship('SalaryPayment', back_populates='payroll_record', uselist=False, cascade='all, delete-orphan')

    def get_snapshot(self):
        if not self.calculation_snapshot:
            return {}
        try:
            return json.loads(self.calculation_snapshot)
        except Exception:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'period_id': self.period_id,
            'period_month': self.payroll_period.month if self.payroll_period else None,
            'period_year': self.payroll_period.year if self.payroll_period else None,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else None,
            'emp_code': self.employee.emp_code if self.employee else None,
            'department_name': self.employee.department.department_name if (self.employee and self.employee.department) else None,
            'wage_type': self.wage_type,
            'base_rate': self.base_rate,
            'total_month_days': self.total_month_days,
            'payable_days': self.payable_days,
            'present_days': self.present_days,
            'absent_days': self.absent_days,
            'half_days': self.half_days,
            'paid_leaves': self.paid_leaves,
            'unpaid_leaves': self.unpaid_leaves,
            'overtime_hours': self.overtime_hours,
            'overtime_amount': self.overtime_amount,
            'gross_earnings': self.gross_earnings,
            'total_deductions': self.total_deductions,
            'net_salary': self.net_salary,
            'status': self.status,
            'review_flag': self.review_flag,
            'review_notes': self.review_notes,
            'earnings': [e.to_dict() for e in self.earnings],
            'deductions': [d.to_dict() for d in self.deductions],
            'payment_id': self.payment.id if self.payment else None,
            'payment_status': self.payment.status if self.payment else 'UNPAID',
            'paid_amount': self.payment.paid_amount if self.payment else 0.0,
            'remaining_amount': self.payment.remaining_amount if self.payment else self.net_salary,
            'payslip_number': self.payslip.payslip_number if self.payslip else None
        }

class PayrollEarning(db.Model):
    __tablename__ = 'payroll_earnings'

    id = db.Column(db.Integer, primary_key=True)
    payroll_record_id = db.Column(db.Integer, db.ForeignKey('payroll_records.id', ondelete='CASCADE'), nullable=False, index=True)
    component_name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)

    payroll_record = db.relationship('PayrollRecord', back_populates='earnings')

    def to_dict(self):
        return {
            'id': self.id,
            'component_name': self.component_name,
            'amount': self.amount
        }

class PayrollDeduction(db.Model):
    __tablename__ = 'payroll_deductions'

    id = db.Column(db.Integer, primary_key=True)
    payroll_record_id = db.Column(db.Integer, db.ForeignKey('payroll_records.id', ondelete='CASCADE'), nullable=False, index=True)
    deduction_name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    is_statutory = db.Column(db.Boolean, default=False)

    payroll_record = db.relationship('PayrollRecord', back_populates='deductions')

    def to_dict(self):
        return {
            'id': self.id,
            'deduction_name': self.deduction_name,
            'amount': self.amount,
            'is_statutory': self.is_statutory
        }

class Payslip(db.Model):
    __tablename__ = 'payslips'

    id = db.Column(db.Integer, primary_key=True)
    payroll_record_id = db.Column(db.Integer, db.ForeignKey('payroll_records.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    payslip_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    generated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    net_salary_words = db.Column(db.String(255))
    file_path = db.Column(db.String(255))
    is_sent = db.Column(db.Boolean, default=False)

    payroll_record = db.relationship('PayrollRecord', back_populates='payslip')

    def to_dict(self):
        return {
            'id': self.id,
            'payroll_record_id': self.payroll_record_id,
            'payslip_number': self.payslip_number,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'net_salary_words': self.net_salary_words,
            'file_path': self.file_path,
            'is_sent': self.is_sent
        }

class SalaryPayment(db.Model):
    __tablename__ = 'salary_payments'

    id = db.Column(db.Integer, primary_key=True)
    payroll_record_id = db.Column(db.Integer, db.ForeignKey('payroll_records.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    payment_mode = db.Column(db.String(50), default='Bank Transfer') # Bank Transfer, Cash, UPI, Gateway, NEFT
    transaction_ref = db.Column(db.String(100), index=True)
    payment_date = db.Column(db.Date, default=date.today)
    
    # Financial reconciliation
    amount = db.Column(db.Float, nullable=False, default=0.0) # Net payable total
    paid_amount = db.Column(db.Float, nullable=False, default=0.0) # Cumulative amount settled
    remaining_amount = db.Column(db.Float, nullable=False, default=0.0) # Unsettled balance
    
    # Standardized Payment statuses: UNPAID, PARTIALLY_PAID, PAYMENT_PROCESSING, PAID, FAILED, REFUNDED
    status = db.Column(db.String(30), default='UNPAID', index=True)
    idempotency_key = db.Column(db.String(120), unique=True, nullable=True, index=True)
    
    reconciled_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reconciled_at = db.Column(db.DateTime)
    bank_statement_ref = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    payroll_record = db.relationship('PayrollRecord', back_populates='payment')
    transactions = db.relationship('PaymentTransaction', back_populates='salary_payment', cascade='all, delete-orphan', order_by='PaymentTransaction.id.desc()')

    def to_dict(self):
        emp = self.payroll_record.employee if (self.payroll_record and self.payroll_record.employee) else None
        period = self.payroll_record.payroll_period if (self.payroll_record and self.payroll_record.payroll_period) else None
        
        # Calculate dynamic remaining amount if unset
        rem = self.remaining_amount if self.remaining_amount is not None else max(0.0, self.amount - (self.paid_amount or 0.0))
        
        return {
            'id': self.id,
            'payroll_record_id': self.payroll_record_id,
            'employee_id': emp.id if emp else None,
            'employee_name': emp.full_name if emp else None,
            'emp_code': emp.emp_code if emp else None,
            'department': emp.department.department_name if (emp and emp.department) else 'N/A',
            'designation': emp.designation if emp else 'N/A',
            'wage_type': self.payroll_record.wage_type if self.payroll_record else 'N/A',
            'bank_account_no': emp.bank_account_no if emp else 'N/A',
            'bank_ifsc': emp.bank_ifsc if emp else 'N/A',
            'bank_name': emp.bank_name if emp else 'N/A',
            'period_id': period.id if period else None,
            'period_label': period.to_dict()['period_label'] if period else '',
            'salary_month': f"{period.month:02d}/{period.year}" if period else '',
            'gross_salary': self.payroll_record.gross_earnings if self.payroll_record else 0.0,
            'total_deductions': self.payroll_record.total_deductions if self.payroll_record else 0.0,
            'net_payable': self.amount,
            'paid_amount': self.paid_amount or 0.0,
            'remaining_amount': round(rem, 2),
            'amount': self.amount,
            'payment_mode': self.payment_mode,
            'transaction_ref': self.transaction_ref,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'status': self.status,
            'reconciled_at': self.reconciled_at.isoformat() if self.reconciled_at else None,
            'bank_statement_ref': self.bank_statement_ref,
            'notes': self.notes,
            'transactions_count': len(self.transactions) if self.transactions else 0
        }

class PaymentTransaction(db.Model):
    __tablename__ = 'payment_transactions'

    id = db.Column(db.Integer, primary_key=True)
    salary_payment_id = db.Column(db.Integer, db.ForeignKey('salary_payments.id', ondelete='CASCADE'), nullable=False, index=True)
    transaction_ref = db.Column(db.String(100), unique=True, nullable=False, index=True)
    idempotency_key = db.Column(db.String(120), unique=True, nullable=True, index=True)
    amount = db.Column(db.Float, nullable=False)
    payment_mode = db.Column(db.String(50), default='Bank Transfer') # Bank Transfer, NEFT, IMPS, UPI, Gateway, Cash
    status = db.Column(db.String(30), nullable=False, default='PAYMENT_PROCESSING', index=True) # PAYMENT_PROCESSING, PAID, FAILED, REFUNDED
    provider = db.Column(db.String(50), default='SANDBOX_GATEWAY') # SANDBOX_GATEWAY, BANK_API, RAZORPAYX, CASHFREE
    provider_tx_id = db.Column(db.String(100), index=True)
    provider_response = db.Column(db.Text)
    failure_reason = db.Column(db.String(255))
    initiated_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    initiated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    confirmed_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text)

    salary_payment = db.relationship('SalaryPayment', back_populates='transactions')
    initiator = db.relationship('User')

    def to_dict(self):
        emp = self.salary_payment.payroll_record.employee if (self.salary_payment and self.salary_payment.payroll_record) else None
        period = self.salary_payment.payroll_record.payroll_period if (self.salary_payment and self.salary_payment.payroll_record) else None
        return {
            'id': self.id,
            'salary_payment_id': self.salary_payment_id,
            'transaction_ref': self.transaction_ref,
            'idempotency_key': self.idempotency_key,
            'amount': self.amount,
            'payment_mode': self.payment_mode,
            'status': self.status,
            'provider': self.provider,
            'provider_tx_id': self.provider_tx_id,
            'failure_reason': self.failure_reason,
            'initiated_by': self.initiator.full_name if self.initiator else 'System',
            'initiated_at': self.initiated_at.isoformat() if self.initiated_at else None,
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None,
            'notes': self.notes,
            'employee_name': emp.full_name if emp else None,
            'emp_code': emp.emp_code if emp else None,
            'department': emp.department.department_name if (emp and emp.department) else None,
            'period_label': period.to_dict()['period_label'] if period else None,
            'salary_month': f"{period.month:02d}/{period.year}" if period else None,
            'gross_salary': self.salary_payment.payroll_record.gross_earnings if (self.salary_payment and self.salary_payment.payroll_record) else 0.0,
            'total_deductions': self.salary_payment.payroll_record.total_deductions if (self.salary_payment and self.salary_payment.payroll_record) else 0.0,
            'net_payable': self.salary_payment.amount if self.salary_payment else 0.0,
            'remaining_amount': self.salary_payment.remaining_amount if self.salary_payment else 0.0
        }
