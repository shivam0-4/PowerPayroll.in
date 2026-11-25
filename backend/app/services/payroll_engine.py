import json
import calendar
from datetime import date, datetime, timezone
from app.database import db
from app.models.employee import Employee, SalaryStructure
from app.models.attendance import Attendance
from app.models.advance import Advance, AdvanceRepayment
from app.models.payroll import (
    PayrollPeriod,
    PayrollRecord,
    PayrollEarning,
    PayrollDeduction,
    Payslip,
    SalaryPayment
)
from app.models.company import Company
from app.services.statutory_engine import StatutoryEngine
from app.utils.helpers import number_to_indian_words
from app.utils.audit import log_audit, create_notification

class PayrollEngine:

    @staticmethod
    def get_or_create_period(month, year, total_working_days=None):
        period = PayrollPeriod.query.filter_by(month=month, year=year).first()
        if not period:
            _, num_days = calendar.monthrange(year, month)
            start_d = date(year, month, 1)
            end_d = date(year, month, num_days)
            working_days = total_working_days if total_working_days else 26
            
            period = PayrollPeriod(
                month=month,
                year=year,
                start_date=start_d,
                end_date=end_d,
                total_working_days=working_days,
                status='Draft'
            )
            db.session.add(period)
            db.session.commit()
        return period

    @staticmethod
    def process_payroll_for_period(period_id, user_id=None):
        period = PayrollPeriod.query.get(period_id)
        if not period:
            raise ValueError("Payroll period not found")

        if period.status in ['Approved', 'Locked']:
            raise ValueError(f"Cannot recalculate payroll in '{period.status}' state. Must be in 'Draft' or 'Calculated'.")

        # Fetch company settings
        company = Company.query.first()
        ot_multiplier = company.default_overtime_multiplier if company else 2.0
        daily_hours = company.daily_working_hours if company else 8.0

        # Fetch active employees
        employees = Employee.query.filter(Employee.is_active == True, Employee.status == 'Active').all()

        _, days_in_month = calendar.monthrange(period.year, period.month)
        start_date = date(period.year, period.month, 1)
        end_date = date(period.year, period.month, days_in_month)

        total_gross = 0.0
        total_deductions = 0.0
        total_net = 0.0
        processed_count = 0

        for emp in employees:
            # Check if employee joined after the period or left before
            if emp.join_date and emp.join_date > end_date:
                continue
            if emp.exit_date and emp.exit_date < start_date:
                continue

            # Fetch monthly attendance records for employee
            att_records = Attendance.query.filter(
                Attendance.employee_id == emp.id,
                Attendance.date >= start_date,
                Attendance.date <= end_date
            ).all()

            present_days = 0.0
            half_days = 0.0
            weekly_offs = 0.0
            paid_leaves = 0.0
            unpaid_leaves = 0.0
            absent_days = 0.0
            holidays = 0.0
            total_ot_hours = 0.0

            for att in att_records:
                st = att.status
                if st == 'Present':
                    present_days += 1.0
                elif st == 'Half Day':
                    half_days += 1.0
                elif st == 'Weekly Off':
                    weekly_offs += 1.0
                elif st == 'Paid Leave':
                    paid_leaves += 1.0
                elif st == 'Unpaid Leave':
                    unpaid_leaves += 1.0
                elif st == 'Absent':
                    absent_days += 1.0
                elif st == 'Holiday':
                    holidays += 1.0
                
                if att.overtime_hours and att.overtime_hours > 0:
                    total_ot_hours += att.overtime_hours

            # Calculate payable days
            # Payable days = Present + (Half Days * 0.5) + Weekly Offs + Paid Leaves + Holidays
            payable_days = present_days + (half_days * 0.5) + weekly_offs + paid_leaves + holidays
            
            # If no attendance records marked at all, default to 0 with review flag
            review_flags = []
            if len(att_records) == 0:
                review_flags.append("No attendance records found for this period")

            # Fetch active salary structure or base employee wage
            salary_struct = SalaryStructure.query.filter(
                SalaryStructure.employee_id == emp.id,
                SalaryStructure.is_active == True
            ).first()

            earnings_items = []
            deductions_items = []

            gross_salary = 0.0
            basic_salary = 0.0
            da_salary = 0.0
            overtime_pay = 0.0

            # Calculation based on wage type
            if emp.wage_type == 'daily_wage':
                daily_rate = emp.daily_wage_rate or (salary_struct.basic_pay if salary_struct else 0.0)
                basic_salary = round(daily_rate * payable_days, 2)
                base_hourly_rate = (daily_rate / daily_hours) if daily_hours > 0 else 0.0
                overtime_pay = round(total_ot_hours * base_hourly_rate * ot_multiplier, 2)

                earnings_items.append({'name': 'Basic Wages', 'amount': basic_salary})
                if overtime_pay > 0:
                    earnings_items.append({'name': 'Overtime Pay', 'amount': overtime_pay})

                if salary_struct:
                    if salary_struct.special_allowance > 0:
                        allowance = round((salary_struct.special_allowance / (period.total_working_days or 26)) * payable_days, 2)
                        earnings_items.append({'name': 'Special Allowance', 'amount': allowance})
                    if salary_struct.incentive > 0:
                        earnings_items.append({'name': 'Incentive', 'amount': salary_struct.incentive})
                    if salary_struct.production_bonus > 0:
                        earnings_items.append({'name': 'Production Bonus', 'amount': salary_struct.production_bonus})

            else: # monthly_salary
                monthly_base = emp.monthly_salary or (salary_struct.basic_pay if salary_struct else 0.0)
                std_working_days = period.total_working_days if period.total_working_days > 0 else 26.0

                # Adjusted basic according to payable days
                day_rate = monthly_base / std_working_days if std_working_days > 0 else 0.0
                basic_salary = round(min(monthly_base, day_rate * payable_days), 2)
                earnings_items.append({'name': 'Basic Salary', 'amount': basic_salary})

                # Pro-rated allowances if configured
                if salary_struct:
                    da_rate = (salary_struct.da / std_working_days) * payable_days
                    da_salary = round(da_rate, 2)
                    if da_salary > 0:
                        earnings_items.append({'name': 'Dearness Allowance (DA)', 'amount': da_salary})

                    hra_rate = (salary_struct.hra / std_working_days) * payable_days
                    if hra_rate > 0:
                        earnings_items.append({'name': 'House Rent Allowance (HRA)', 'amount': round(hra_rate, 2)})

                    conv_rate = (salary_struct.conveyance / std_working_days) * payable_days
                    if conv_rate > 0:
                        earnings_items.append({'name': 'Conveyance Allowance', 'amount': round(conv_rate, 2)})

                    spec_rate = (salary_struct.special_allowance / std_working_days) * payable_days
                    if spec_rate > 0:
                        earnings_items.append({'name': 'Special Allowance', 'amount': round(spec_rate, 2)})

                    if salary_struct.incentive > 0:
                        earnings_items.append({'name': 'Incentive', 'amount': salary_struct.incentive})

                    if salary_struct.production_bonus > 0:
                        earnings_items.append({'name': 'Bonus', 'amount': salary_struct.production_bonus})

                # Monthly worker OT calculation
                ot_rate_hour = salary_struct.overtime_rate_per_hour if (salary_struct and salary_struct.overtime_rate_per_hour > 0) else ((monthly_base / (std_working_days * daily_hours)) * ot_multiplier if std_working_days > 0 else 0.0)
                overtime_pay = round(total_ot_hours * ot_rate_hour, 2)
                if overtime_pay > 0:
                    earnings_items.append({'name': 'Overtime Pay', 'amount': overtime_pay})

            gross_salary = sum(item['amount'] for item in earnings_items)

            # Statutory Deductions
            state = emp.work_location.state if (emp.work_location and emp.work_location.state) else 'Gujarat'
            basic_da_base = basic_salary + da_salary
            statutory_res = StatutoryEngine.calculate_statutory_deductions(
                employee=emp,
                gross_earnings=gross_salary,
                basic_da_earnings=basic_da_base,
                state=state,
                effective_date=end_date
            )

            if statutory_res['epf_employee'] > 0:
                deductions_items.append({'name': 'EPF (Provident Fund)', 'amount': statutory_res['epf_employee'], 'is_statutory': True})
            if statutory_res['esic_employee'] > 0:
                deductions_items.append({'name': 'ESIC', 'amount': statutory_res['esic_employee'], 'is_statutory': True})
            if statutory_res['professional_tax'] > 0:
                deductions_items.append({'name': 'Professional Tax (PT)', 'amount': statutory_res['professional_tax'], 'is_statutory': True})
            if statutory_res['tds'] > 0:
                deductions_items.append({'name': 'TDS (Income Tax)', 'amount': statutory_res['tds'], 'is_statutory': True})

            if statutory_res.get('review_flags'):
                review_flags.extend(statutory_res['review_flags'])

            # Advance & Loan Recovery Deductions
            # Only apply if approved and remaining_amount > 0
            advances = Advance.query.filter(
                Advance.employee_id == emp.id,
                Advance.status == 'Approved',
                Advance.remaining_amount > 0
            ).all()

            advance_deducted = 0.0
            advance_repayments_to_create = []

            for adv in advances:
                emi = min(adv.monthly_installment, adv.remaining_amount)
                if emi > 0:
                    advance_deducted += emi
                    deductions_items.append({
                        'name': f"Advance Recovery (ID #{adv.id})",
                        'amount': emi,
                        'is_statutory': False,
                        'advance_id': adv.id
                    })
                    advance_repayments_to_create.append({
                        'advance': adv,
                        'amount': emi
                    })

            total_emp_deductions = sum(item['amount'] for item in deductions_items)
            net_salary = max(0.0, round(gross_salary - total_emp_deductions, 2))

            # Store or update PayrollRecord
            record = PayrollRecord.query.filter_by(period_id=period.id, employee_id=emp.id).first()
            if not record:
                record = PayrollRecord(period_id=period.id, employee_id=emp.id)
                db.session.add(record)

            record.wage_type = emp.wage_type
            record.base_rate = emp.daily_wage_rate if emp.wage_type == 'daily_wage' else emp.monthly_salary
            record.total_month_days = days_in_month
            record.payable_days = payable_days
            record.present_days = present_days
            record.absent_days = absent_days
            record.half_days = half_days
            record.paid_leaves = paid_leaves
            record.unpaid_leaves = unpaid_leaves
            record.overtime_hours = total_ot_hours
            record.overtime_amount = overtime_pay
            record.gross_earnings = gross_salary
            record.total_deductions = total_emp_deductions
            record.net_salary = net_salary
            record.status = 'Calculated'
            record.review_flag = (len(review_flags) > 0)
            record.review_notes = "; ".join(review_flags) if review_flags else None

            # Calculation snapshot for full audit reproducibility
            snapshot = {
                'employee_code': emp.emp_code,
                'employee_name': emp.full_name,
                'designation': emp.designation,
                'wage_type': emp.wage_type,
                'base_rate': record.base_rate,
                'attendance_summary': {
                    'present': present_days,
                    'half_days': half_days,
                    'weekly_offs': weekly_offs,
                    'paid_leaves': paid_leaves,
                    'unpaid_leaves': unpaid_leaves,
                    'absent': absent_days,
                    'payable_days': payable_days,
                    'ot_hours': total_ot_hours
                },
                'earnings': earnings_items,
                'deductions': deductions_items,
                'statutory_details': statutory_res.get('details', {}),
                'statutory_employer_contributions': {
                    'epf_employer': statutory_res.get('epf_employer', 0.0),
                    'esic_employer': statutory_res.get('esic_employer', 0.0)
                },
                'calculated_at': datetime.now(timezone.utc).isoformat()
            }
            record.calculation_snapshot = json.dumps(snapshot)

            db.session.flush() # ensure record.id is generated

            # Refresh earnings items
            PayrollEarning.query.filter_by(payroll_record_id=record.id).delete()
            for earn in earnings_items:
                pe = PayrollEarning(
                    payroll_record_id=record.id,
                    component_name=earn['name'],
                    amount=earn['amount']
                )
                db.session.add(pe)

            # Refresh deduction items
            PayrollDeduction.query.filter_by(payroll_record_id=record.id).delete()
            for ded in deductions_items:
                pd = PayrollDeduction(
                    payroll_record_id=record.id,
                    deduction_name=ded['name'],
                    amount=ded['amount'],
                    is_statutory=ded.get('is_statutory', False)
                )
                db.session.add(pd)

            # Ensure SalaryPayment object exists in UNPAID status
            if not record.payment:
                payment = SalaryPayment(
                    payroll_record_id=record.id,
                    payment_mode='Bank Transfer',
                    amount=net_salary,
                    paid_amount=0.0,
                    remaining_amount=net_salary,
                    status='UNPAID'
                )
                db.session.add(payment)
            else:
                record.payment.amount = net_salary
                if record.payment.status == 'UNPAID':
                    record.payment.remaining_amount = net_salary

            total_gross += gross_salary
            total_deductions += total_emp_deductions
            total_net += net_salary
            processed_count += 1

        period.total_gross = round(total_gross, 2)
        period.total_deductions = round(total_deductions, 2)
        period.total_net = round(total_net, 2)
        period.employee_count = processed_count
        period.status = 'Calculated'
        period.processed_at = datetime.now(timezone.utc)

        db.session.commit()

        if user_id:
            log_audit(
                user_id=user_id,
                action='PAYROLL_CALCULATE',
                entity_type='PayrollPeriod',
                entity_id=period.id,
                details={'month': period.month, 'year': period.year, 'count': processed_count, 'net': total_net}
            )

        return period

    @staticmethod
    def approve_payroll(period_id, user_id):
        period = PayrollPeriod.query.get(period_id)
        if not period:
            raise ValueError("Payroll period not found")
        if period.status not in ['Calculated', 'Pending Approval']:
            raise ValueError(f"Cannot approve payroll in '{period.status}' status. Must be 'Calculated'.")

        period.status = 'Approved'
        period.approved_by = user_id
        period.approved_at = datetime.now(timezone.utc)

        # Update all records to Approved
        for r in period.records:
            r.status = 'Approved'

        db.session.commit()
        log_audit(user_id=user_id, action='PAYROLL_APPROVE', entity_type='PayrollPeriod', entity_id=period.id)
        return period

    @staticmethod
    def lock_payroll(period_id, user_id):
        period = PayrollPeriod.query.get(period_id)
        if not period:
            raise ValueError("Payroll period not found")
        if period.status != 'Approved':
            raise ValueError("Payroll must be approved before it can be locked.")

        period.status = 'Locked'
        period.locked_by = user_id
        period.locked_at = datetime.now(timezone.utc)

        # Generate Payslips for all records and link advance deductions
        for r in period.records:
            r.status = 'Locked'
            
            # Payslip generation
            payslip_no = f"GP-PAY-{period.year}{period.month:02d}-{r.employee.emp_code}"
            if not r.payslip:
                words = number_to_indian_words(r.net_salary)
                ps = Payslip(
                    payroll_record_id=r.id,
                    payslip_number=payslip_no,
                    net_salary_words=words
                )
                db.session.add(ps)
            
            # Finalize advance repayments
            snap = r.get_snapshot()
            for ded in snap.get('deductions', []):
                adv_id = ded.get('advance_id')
                if adv_id:
                    adv = Advance.query.get(adv_id)
                    if adv:
                        ded_amt = ded['amount']
                        new_rem = max(0.0, adv.remaining_amount - ded_amt)
                        adv.remaining_amount = new_rem
                        if new_rem == 0.0:
                            adv.status = 'Settled'
                        
                        repayment = AdvanceRepayment(
                            advance_id=adv.id,
                            payroll_record_id=r.id,
                            amount=ded_amt,
                            remaining_balance_after=new_rem,
                            payment_mode='Payroll Deduction',
                            notes=f"Deducted in Payroll {period.month}/{period.year}"
                        )
                        db.session.add(repayment)

        db.session.commit()
        log_audit(user_id=user_id, action='PAYROLL_LOCK', entity_type='PayrollPeriod', entity_id=period.id)
        return period
