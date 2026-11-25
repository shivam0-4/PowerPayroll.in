from datetime import date, datetime, timedelta
from flask import Blueprint, jsonify
from app.database import db
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.payroll import PayrollPeriod, PayrollRecord, SalaryPayment
from app.models.advance import Advance
from app.models.company import Department
from app.services.payment_service import PaymentService
from app.utils.decorators import token_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/analytics', methods=['GET'])
@token_required
def get_analytics():
    today = date.today()

    # 1. Employee metrics
    total_employees = Employee.query.count()
    active_employees = Employee.query.filter_by(is_active=True, status='Active').count()

    # 2. Today's Attendance
    today_records = Attendance.query.filter_by(date=today).all()
    present_today = sum(1 for a in today_records if a.status in ['Present', 'Half Day'])
    absent_today = sum(1 for a in today_records if a.status == 'Absent')

    # 3. Latest or Current Payroll Period
    latest_period = PayrollPeriod.query.order_by(PayrollPeriod.year.desc(), PayrollPeriod.month.desc()).first()
    monthly_gross = latest_period.total_gross if latest_period else 0.0
    monthly_deductions = latest_period.total_deductions if latest_period else 0.0
    monthly_net = latest_period.total_net if latest_period else 0.0
    period_status = latest_period.status if latest_period else 'None'
    period_label = latest_period.to_dict()['period_label'] if latest_period else 'No Period'

    # 4. Pending Advances
    active_advances = Advance.query.filter(Advance.status == 'Approved', Advance.remaining_amount > 0).all()
    pending_advances_total = sum(a.remaining_amount for a in active_advances)

    # 5. Pending Payments Summary
    payment_summary = PaymentService.get_payment_summary()
    pending_payments_count = payment_summary['pending_employees_count']
    pending_payments_total = payment_summary['total_pending_amount']

    # 6. Monthly Salary Trends (last 6 periods)
    periods = PayrollPeriod.query.order_by(PayrollPeriod.year.asc(), PayrollPeriod.month.asc()).limit(6).all()
    monthly_trends = []
    for p in periods:
        monthly_trends.append({
            'period': f"{date(p.year, p.month, 1).strftime('%b %Y')}",
            'gross': p.total_gross,
            'deductions': p.total_deductions,
            'net': p.total_net,
            'employees': p.employee_count
        })

    # 7. Department-wise Cost Breakdown for latest period
    department_costs = []
    if latest_period:
        depts = Department.query.all()
        for d in depts:
            cost = db.session.query(db.func.sum(PayrollRecord.gross_earnings)).join(Employee).filter(
                PayrollRecord.period_id == latest_period.id,
                Employee.department_id == d.id
            ).scalar() or 0.0

            emp_cnt = db.session.query(db.func.count(PayrollRecord.id)).join(Employee).filter(
                PayrollRecord.period_id == latest_period.id,
                Employee.department_id == d.id
            ).scalar() or 0

            if cost > 0 or emp_cnt > 0:
                department_costs.append({
                    'department': d.department_name,
                    'cost': round(cost, 2),
                    'employees': emp_cnt
                })

    # 8. Category Distribution
    categories = db.session.query(
        Employee.employment_category, db.func.count(Employee.id)
    ).filter(Employee.is_active == True).group_by(Employee.employment_category).all()
    
    category_distribution = [{'name': c[0], 'value': c[1]} for c in categories]

    # 9. Attendance Trends (last 7 days)
    attendance_trends = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_att = Attendance.query.filter_by(date=day).all()
        attendance_trends.append({
            'date': day.strftime('%d %b'),
            'present': sum(1 for a in day_att if a.status in ['Present', 'Half Day']),
            'absent': sum(1 for a in day_att if a.status == 'Absent'),
            'ot_hours': sum(a.overtime_hours for a in day_att)
        })

    # 10. System Alerts & Pending Items
    alerts = []
    if latest_period and latest_period.status in ['Draft', 'Calculated']:
        alerts.append({
            'id': 1,
            'type': 'warning',
            'title': 'Payroll Pending Approval',
            'message': f"Payroll for {period_label} is in '{latest_period.status}' status and requires review & approval."
        })
    if pending_payments_count > 0:
        alerts.append({
            'id': 2,
            'type': 'info',
            'title': 'Pending Salary Payments',
            'message': f"{pending_payments_count} employee dues (₹{pending_payments_total:,.2f}) pending one-tap settlement."
        })
    if payment_summary.get('overdue_count', 0) > 0:
        alerts.append({
            'id': 3,
            'type': 'danger',
            'title': 'Overdue Salary Dues',
            'message': f"{payment_summary['overdue_count']} employee payments are overdue from previous periods."
        })
    if absent_today > 0:
        alerts.append({
            'id': 4,
            'type': 'danger',
            'title': 'Daily Absenteeism Alert',
            'message': f"{absent_today} workers marked absent today ({today.strftime('%d %b %Y')})."
        })

    return jsonify({
        'kpis': {
            'total_employees': total_employees,
            'active_employees': active_employees,
            'present_today': present_today,
            'absent_today': absent_today,
            'monthly_gross': round(monthly_gross, 2),
            'monthly_deductions': round(monthly_deductions, 2),
            'monthly_net': round(monthly_net, 2),
            'latest_period_label': period_label,
            'latest_period_status': period_status,
            'pending_advances': round(pending_advances_total, 2),
            'pending_payments_total': round(pending_payments_total, 2),
            'pending_payments_count': pending_payments_count,
            'pending_summary': payment_summary
        },
        'monthly_trends': monthly_trends,
        'department_costs': department_costs,
        'category_distribution': category_distribution,
        'attendance_trends': attendance_trends,
        'alerts': alerts
    }), 200
