from datetime import datetime, timezone, date, time
from app.database import db
from app.models.attendance import Attendance, AttendanceApproval
from app.models.employee import Employee
from app.utils.audit import log_audit

class AttendanceService:

    @staticmethod
    def mark_attendance(employee_id, att_date, status, check_in=None, check_out=None, working_hours=8.0, overtime_hours=0.0, shift='General', remarks=None, user_id=None):
        att = Attendance.query.filter_by(employee_id=employee_id, date=att_date).first()
        if att and att.is_locked:
            raise ValueError(f"Attendance for {att_date} is locked by approval and cannot be modified.")

        if not att:
            att = Attendance(
                employee_id=employee_id,
                date=att_date,
                created_by=user_id
            )
            db.session.add(att)

        att.status = status
        att.shift = shift or 'General'
        att.remarks = remarks

        # Parse times if strings
        if isinstance(check_in, str) and check_in:
            parts = check_in.split(':')
            att.check_in = time(int(parts[0]), int(parts[1]))
        elif isinstance(check_in, time):
            att.check_in = check_in

        if isinstance(check_out, str) and check_out:
            parts = check_out.split(':')
            att.check_out = time(int(parts[0]), int(parts[1]))
        elif isinstance(check_out, time):
            att.check_out = check_out

        # Auto calculate working hours based on status if not explicitly given
        if status == 'Present':
            att.working_hours = float(working_hours) if working_hours else 8.0
        elif status == 'Half Day':
            att.working_hours = 4.0
        elif status in ['Absent', 'Unpaid Leave']:
            att.working_hours = 0.0
        elif status in ['Weekly Off', 'Paid Leave', 'Holiday']:
            att.working_hours = 8.0

        att.overtime_hours = float(overtime_hours) if overtime_hours else 0.0
        db.session.commit()

        if user_id:
            log_audit(user_id=user_id, action='ATTENDANCE_MARK', entity_type='Attendance', entity_id=att.id, details={'emp': employee_id, 'date': str(att_date), 'status': status})

        return att

    @staticmethod
    def bulk_mark_attendance(records, user_id=None):
        updated_count = 0
        for item in records:
            emp_id = item.get('employee_id')
            d_str = item.get('date')
            if isinstance(d_str, str):
                d = datetime.strptime(d_str, '%Y-%m-%d').date()
            else:
                d = d_str
            st = item.get('status', 'Present')
            ot = float(item.get('overtime_hours', 0.0))
            shift = item.get('shift', 'General')
            remarks = item.get('remarks')
            
            AttendanceService.mark_attendance(
                employee_id=emp_id,
                att_date=d,
                status=st,
                overtime_hours=ot,
                shift=shift,
                remarks=remarks,
                user_id=user_id
            )
            updated_count += 1
        return updated_count

    @staticmethod
    def approve_and_lock_month(month, year, department_id=None, user_id=None, notes=None):
        approval = AttendanceApproval.query.filter_by(
            month=month,
            year=year,
            department_id=department_id
        ).first()

        if not approval:
            approval = AttendanceApproval(
                month=month,
                year=year,
                department_id=department_id,
                approved_by=user_id,
                is_locked=True,
                notes=notes
            )
            db.session.add(approval)
        else:
            approval.approved_by = user_id
            approval.is_locked = True
            approval.notes = notes
            approval.approved_at = datetime.now(timezone.utc)

        # Lock records
        query = Attendance.query.join(Employee).filter(
            db.extract('month', Attendance.date) == month,
            db.extract('year', Attendance.date) == year
        )
        if department_id:
            query = query.filter(Employee.department_id == department_id)

        records = query.all()
        for r in records:
            r.is_locked = True

        approval.total_records = len(records)
        db.session.commit()

        if user_id:
            log_audit(user_id=user_id, action='ATTENDANCE_APPROVE', entity_type='AttendanceApproval', entity_id=approval.id)

        return approval
