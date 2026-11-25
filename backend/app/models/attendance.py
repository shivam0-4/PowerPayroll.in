from datetime import datetime, timezone, date, time
from app.database import db

class Attendance(db.Model):
    __tablename__ = 'attendance'
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'date', name='uq_employee_attendance_date'),
    )

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    
    # Statuses: Present, Absent, Half Day, Weekly Off, Paid Leave, Unpaid Leave, Holiday, Overtime
    status = db.Column(db.String(30), nullable=False, default='Present', index=True)
    check_in = db.Column(db.Time, nullable=True)
    check_out = db.Column(db.Time, nullable=True)
    working_hours = db.Column(db.Float, default=8.0)
    overtime_hours = db.Column(db.Float, default=0.0)
    shift = db.Column(db.String(30), default='General') # General, Morning, Afternoon, Night
    remarks = db.Column(db.String(255))
    is_locked = db.Column(db.Boolean, default=False, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    employee = db.relationship('Employee', back_populates='attendance_records')

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else None,
            'emp_code': self.employee.emp_code if self.employee else None,
            'department_name': self.employee.department.department_name if (self.employee and self.employee.department) else None,
            'date': self.date.isoformat() if self.date else None,
            'status': self.status,
            'check_in': self.check_in.strftime('%H:%M') if self.check_in else None,
            'check_out': self.check_out.strftime('%H:%M') if self.check_out else None,
            'working_hours': self.working_hours,
            'overtime_hours': self.overtime_hours,
            'shift': self.shift,
            'remarks': self.remarks,
            'is_locked': self.is_locked
        }

class AttendanceApproval(db.Model):
    __tablename__ = 'attendance_approvals'
    __table_args__ = (
        db.UniqueConstraint('month', 'year', 'department_id', name='uq_attendance_approval_period_dept'),
    )

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Integer, nullable=False, index=True) # 1 - 12
    year = db.Column(db.Integer, nullable=False, index=True)  # e.g., 2026
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True, index=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_locked = db.Column(db.Boolean, default=True)
    total_records = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'month': self.month,
            'year': self.year,
            'department_id': self.department_id,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'is_locked': self.is_locked,
            'total_records': self.total_records,
            'notes': self.notes
        }

class LeaveRecord(db.Model):
    __tablename__ = 'leave_records'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    leave_type = db.Column(db.String(50), nullable=False) # Paid Leave, Sick Leave, Casual Leave, Unpaid Leave
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    days = db.Column(db.Float, nullable=False, default=1.0)
    reason = db.Column(db.Text)
    status = db.Column(db.String(30), default='Pending', index=True) # Pending, Approved, Rejected, Cancelled
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    employee = db.relationship('Employee')

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'emp_code': self.employee.emp_code if self.employee else None,
            'employee_name': self.employee.full_name if self.employee else None,
            'leave_type': self.leave_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'days': self.days,
            'reason': self.reason,
            'status': self.status,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None
        }

class OvertimeRecord(db.Model):
    __tablename__ = 'overtime_records'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    hours = db.Column(db.Float, nullable=False, default=0.0)
    multiplier = db.Column(db.Float, default=2.0) # Double regular wage
    approved_hours = db.Column(db.Float, default=0.0)
    reason = db.Column(db.String(255))
    status = db.Column(db.String(30), default='Approved', index=True) # Pending, Approved, Rejected
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime)

    employee = db.relationship('Employee')

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else None,
            'date': self.date.isoformat() if self.date else None,
            'hours': self.hours,
            'multiplier': self.multiplier,
            'approved_hours': self.approved_hours,
            'status': self.status
        }
