from flask import Blueprint, request, jsonify
from app.models.payroll import Payslip, PayrollRecord, PayrollPeriod
from app.models.employee import Employee
from app.models.company import Company
from app.utils.decorators import token_required
from app.utils.helpers import number_to_indian_words, mask_sensitive

payslip_bp = Blueprint('payslips', __name__, url_prefix='/api/payslips')

@payslip_bp.route('/<int:payslip_id>', methods=['GET'])
@token_required
def get_payslip(payslip_id):
    ps = Payslip.query.get_or_404(payslip_id)
    rec = ps.payroll_record
    emp = rec.employee
    comp = Company.query.first()
    period = rec.payroll_period

    company_data = {
        'name': comp.name if comp else 'GROUPON POWER INFRA & LABOUR LTD',
        'address': comp.registered_address if comp else 'Industrial Area, Phase 2, Sanand, Gujarat',
        'gst_no': comp.gst_no if comp else '',
        'pan_no': comp.pan_no if comp else '',
        'pf_establishment_code': comp.pf_establishment_code if comp else '',
        'esic_employer_code': comp.esic_employer_code if comp else '',
        'logo_url': comp.logo_url if comp else ''
    }

    employee_data = {
        'id': emp.id,
        'emp_code': emp.emp_code,
        'full_name': emp.full_name,
        'department': emp.department.department_name if emp.department else 'N/A',
        'designation': emp.designation,
        'employment_category': emp.employment_category,
        'wage_type': emp.wage_type,
        'join_date': emp.join_date.isoformat() if emp.join_date else None,
        'bank_name': emp.bank_name,
        'bank_account_masked': mask_sensitive(emp.bank_account_no, 4),
        'bank_ifsc': emp.bank_ifsc,
        'uan': mask_sensitive(emp.uan, 4) if emp.uan else 'N/A',
        'esic_ip_number': emp.esic_ip_number or 'N/A',
        'pan_masked': mask_sensitive(emp.pan, 4) if emp.pan else 'N/A'
    }

    attendance_data = {
        'total_working_days': period.total_working_days if period else 26,
        'present_days': rec.present_days,
        'half_days': rec.half_days,
        'absent_days': rec.absent_days,
        'paid_leaves': rec.paid_leaves,
        'unpaid_leaves': rec.unpaid_leaves,
        'payable_days': rec.payable_days,
        'overtime_hours': rec.overtime_hours
    }

    return jsonify({
        'payslip': {
            'id': ps.id,
            'payslip_number': ps.payslip_number,
            'salary_month': f"{period.month:02d}/{period.year}" if period else '',
            'month_name': period.to_dict()['period_label'] if period else '',
            'company': company_data,
            'employee': employee_data,
            'attendance': attendance_data,
            'earnings': [e.to_dict() for e in rec.earnings],
            'deductions': [d.to_dict() for d in rec.deductions],
            'gross_earnings': rec.gross_earnings,
            'total_deductions': rec.total_deductions,
            'net_salary': rec.net_salary,
            'net_salary_words': ps.net_salary_words or number_to_indian_words(rec.net_salary),
            'payment_status': rec.payment.status if rec.payment else 'Pending',
            'payment_date': rec.payment.payment_date.isoformat() if (rec.payment and rec.payment.payment_date) else None,
            'transaction_ref': rec.payment.transaction_ref if rec.payment else None
        }
    }), 200

@payslip_bp.route('/employee/<int:emp_id>', methods=['GET'])
@token_required
def get_employee_payslips(emp_id):
    records = PayrollRecord.query.filter_by(employee_id=emp_id).order_by(PayrollRecord.id.desc()).all()
    results = []
    for r in records:
        if r.payslip:
            results.append({
                'payslip_id': r.payslip.id,
                'payslip_number': r.payslip.payslip_number,
                'period_label': r.payroll_period.to_dict()['period_label'] if r.payroll_period else '',
                'month': r.payroll_period.month if r.payroll_period else None,
                'year': r.payroll_period.year if r.payroll_period else None,
                'gross_earnings': r.gross_earnings,
                'total_deductions': r.total_deductions,
                'net_salary': r.net_salary,
                'payment_status': r.payment.status if r.payment else 'Pending'
            })
    return jsonify({'payslips': results}), 200

@payslip_bp.route('/period/<int:period_id>', methods=['GET'])
@token_required
def get_period_payslips(period_id):
    records = PayrollRecord.query.filter_by(period_id=period_id).all()
    slips = []
    for r in records:
        if r.payslip:
            slips.append(r.payslip.id)
    return jsonify({'period_id': period_id, 'payslip_ids': slips, 'total': len(slips)}), 200
