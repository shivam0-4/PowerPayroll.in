import io
import csv
from datetime import date
from app.models.payroll import PayrollPeriod, PayrollRecord
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.company import Company

class ReportService:

    @staticmethod
    def get_salary_register(period_id):
        period = PayrollPeriod.query.get(period_id)
        if not period:
            raise ValueError("Payroll period not found")

        records = PayrollRecord.query.filter_by(period_id=period_id).all()
        rows = []
        for r in records:
            emp = r.employee
            snap = r.get_snapshot()
            
            # Extract deductions
            pf_val = 0.0
            esic_val = 0.0
            pt_val = 0.0
            tds_val = 0.0
            adv_val = 0.0
            other_ded = 0.0

            for d in r.deductions:
                dname = d.deduction_name.lower()
                if 'epf' in dname or 'provident' in dname:
                    pf_val += d.amount
                elif 'esic' in dname:
                    esic_val += d.amount
                elif 'professional tax' in dname or 'pt' in dname:
                    pt_val += d.amount
                elif 'tds' in dname or 'income tax' in dname:
                    tds_val += d.amount
                elif 'advance' in dname:
                    adv_val += d.amount
                else:
                    other_ded += d.amount

            rows.append({
                'employee_id': emp.id if emp else None,
                'payroll_record_id': r.id,
                'payment_id': r.payment.id if r.payment else None,
                'employee_code': emp.emp_code if emp else '',
                'full_name': emp.full_name if emp else '',
                'designation': emp.designation if emp else '',
                'department': emp.department.department_name if (emp and emp.department) else '',
                'wage_type': r.wage_type,
                'base_rate': r.base_rate,
                'payable_days': r.payable_days,
                'present_days': r.present_days,
                'overtime_hours': r.overtime_hours,
                'overtime_amount': r.overtime_amount,
                'gross_earnings': r.gross_earnings,
                'pf_deduction': pf_val,
                'esic_deduction': esic_val,
                'pt_deduction': pt_val,
                'tds_deduction': tds_val,
                'advance_recovery': adv_val,
                'other_deductions': other_ded,
                'total_deductions': r.total_deductions,
                'net_salary': r.net_salary,
                'paid_amount': r.payment.paid_amount if r.payment else 0.0,
                'remaining_amount': r.payment.remaining_amount if (r.payment and r.payment.remaining_amount is not None) else (r.payment.amount - (r.payment.paid_amount or 0.0) if r.payment else r.net_salary),
                'payment_status': r.payment.status if r.payment else 'UNPAID',
                'bank_account_no': emp.bank_account_no if emp else '',
                'bank_ifsc': emp.bank_ifsc if emp else '',
                'bank_name': emp.bank_name if emp else ''
            })

        return {
            'period': period.to_dict(),
            'rows': rows,
            'summary': {
                'total_gross': period.total_gross,
                'total_deductions': period.total_deductions,
                'total_net': period.total_net,
                'employee_count': period.employee_count
            }
        }

    @staticmethod
    def export_bank_transfer_csv(period_id):
        period = PayrollPeriod.query.get(period_id)
        if not period:
            raise ValueError("Payroll period not found")

        records = PayrollRecord.query.filter_by(period_id=period_id).all()
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Bank Transfer Format
        writer.writerow([
            'Beneficiary Account No',
            'Beneficiary Name',
            'Amount',
            'IFSC Code',
            'Bank Name',
            'Employee Code',
            'Transaction Remarks'
        ])

        for r in records:
            emp = r.employee
            if not emp:
                continue
            writer.writerow([
                emp.bank_account_no or 'N/A',
                emp.full_name,
                f"{r.net_salary:.2f}",
                emp.bank_ifsc or 'N/A',
                emp.bank_name or 'N/A',
                emp.emp_code,
                f"SALARY-{period.year}-{period.month:02d}"
            ])

        return output.getvalue()

    @staticmethod
    def export_statutory_pf_csv(period_id):
        period = PayrollPeriod.query.get(period_id)
        if not period:
            raise ValueError("Payroll period not found")

        records = PayrollRecord.query.filter_by(period_id=period_id).all()
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            'UAN',
            'Member Name',
            'Gross Wages',
            'EPF Wages',
            'EPS Wages',
            'EE Share (12%)',
            'ER Share (3.67%)',
            'EPS Share (8.33%)'
        ])

        for r in records:
            emp = r.employee
            if not emp or not emp.pf_applicable:
                continue
            
            snap = r.get_snapshot()
            stat_details = snap.get('statutory_details', {}).get('epf', {})
            wage_base = stat_details.get('wage_base', r.gross_earnings)
            ee_share = round(wage_base * 0.12, 2)
            eps_share = round(min(wage_base, 15000.0) * 0.0833, 2)
            er_share = round(max(0, ee_share - eps_share), 2)

            writer.writerow([
                emp.uan or 'N/A',
                emp.full_name,
                f"{r.gross_earnings:.2f}",
                f"{wage_base:.2f}",
                f"{min(wage_base, 15000.0):.2f}",
                f"{ee_share:.2f}",
                f"{er_share:.2f}",
                f"{eps_share:.2f}"
            ])

        return output.getvalue()
