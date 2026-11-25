from datetime import date
from app.models.statutory import StatutoryRule

class StatutoryEngine:
    @staticmethod
    def calculate_statutory_deductions(employee, gross_earnings, basic_da_earnings, state='Gujarat', effective_date=None):
        """
        Calculates EPF, ESIC, Professional Tax, TDS, and LWF based on configurable rules.
        Returns a dict of deductions and review flags.
        """
        if effective_date is None:
            effective_date = date.today()

        deductions = {
            'epf_employee': 0.0,
            'epf_employer': 0.0,
            'esic_employee': 0.0,
            'esic_employer': 0.0,
            'professional_tax': 0.0,
            'tds': 0.0,
            'lwf': 0.0,
            'details': {},
            'review_flags': []
        }

        # 1. EPF Calculation
        if employee.pf_applicable:
            pf_rule = StatutoryRule.query.filter(
                StatutoryRule.statutory_component == 'EPF',
                StatutoryRule.is_active == True,
                StatutoryRule.effective_from <= effective_date,
                (StatutoryRule.effective_until == None) | (StatutoryRule.effective_until >= effective_date)
            ).first()

            ee_rate = pf_rule.employee_rate if pf_rule else 12.0
            er_rate = pf_rule.employer_rate if pf_rule else 12.0
            ceiling = pf_rule.ceiling_limit if pf_rule and pf_rule.ceiling_limit else 15000.0

            # Eligible PF wage base is Basic + DA
            # If basic_da_earnings > 15,000, standard statutory deduction caps wage base at 15000 unless overridden
            pf_wage_base = min(basic_da_earnings, ceiling) if ceiling else basic_da_earnings
            
            ee_pf = round((pf_wage_base * ee_rate) / 100.0, 2)
            er_pf = round((pf_wage_base * er_rate) / 100.0, 2)
            
            deductions['epf_employee'] = ee_pf
            deductions['epf_employer'] = er_pf
            deductions['details']['epf'] = {
                'wage_base': pf_wage_base,
                'rate': ee_rate,
                'ceiling': ceiling,
                'rule_id': pf_rule.id if pf_rule else 'Default'
            }
            if pf_rule and pf_rule.requires_accountant_review:
                deductions['review_flags'].append("EPF calculation rule requires accountant verification")

        # 2. ESIC Calculation
        # Under ESI Act, coverage applies if employee gross wages per month <= 21,000
        if employee.esic_applicable:
            esic_rule = StatutoryRule.query.filter(
                StatutoryRule.statutory_component == 'ESIC',
                StatutoryRule.is_active == True,
                StatutoryRule.effective_from <= effective_date,
                (StatutoryRule.effective_until == None) | (StatutoryRule.effective_until >= effective_date)
            ).first()

            ee_rate = esic_rule.employee_rate if esic_rule else 0.75
            er_rate = esic_rule.employer_rate if esic_rule else 3.25
            ceiling = esic_rule.ceiling_limit if esic_rule and esic_rule.ceiling_limit else 21000.0

            # If gross earnings exceed ceiling, employee is exempt
            if gross_earnings <= ceiling:
                ee_esic = round((gross_earnings * ee_rate) / 100.0, 2)
                er_esic = round((gross_earnings * er_rate) / 100.0, 2)
                deductions['esic_employee'] = ee_esic
                deductions['esic_employer'] = er_esic
                deductions['details']['esic'] = {
                    'wage_base': gross_earnings,
                    'rate': ee_rate,
                    'ceiling': ceiling,
                    'rule_id': esic_rule.id if esic_rule else 'Default'
                }
            else:
                deductions['details']['esic'] = {
                    'exempt': True,
                    'reason': f"Gross earnings {gross_earnings} exceeds statutory threshold of {ceiling}"
                }
            
            if esic_rule and esic_rule.requires_accountant_review:
                deductions['review_flags'].append("ESIC calculation rule flagged for review")

        # 3. Professional Tax Calculation
        if employee.pt_applicable:
            emp_state = state
            if employee.work_location and employee.work_location.state:
                emp_state = employee.work_location.state

            pt_rule = StatutoryRule.query.filter(
                StatutoryRule.statutory_component == 'PT',
                StatutoryRule.state == emp_state,
                StatutoryRule.is_active == True,
                StatutoryRule.effective_from <= effective_date,
                (StatutoryRule.effective_until == None) | (StatutoryRule.effective_until >= effective_date)
            ).first()

            pt_amount = 0.0
            if pt_rule and pt_rule.slab_configuration:
                slabs = pt_rule.get_slabs()
                for slab in slabs:
                    min_amt = slab.get('min', 0)
                    max_amt = slab.get('max', float('inf'))
                    tax = slab.get('tax', 0)
                    if max_amt is None:
                        max_amt = float('inf')
                    if min_amt <= gross_earnings <= max_amt:
                        pt_amount = float(tax)
                        break
            else:
                # Default Gujarat Professional Tax Slabs
                if emp_state.lower() == 'gujarat':
                    if gross_earnings >= 12000:
                        pt_amount = 200.0
                    elif gross_earnings >= 9000:
                        pt_amount = 150.0
                    elif gross_earnings >= 6000:
                        pt_amount = 80.0
                    else:
                        pt_amount = 0.0
                elif emp_state.lower() == 'maharashtra':
                    if gross_earnings > 10000:
                        pt_amount = 200.0
                    elif gross_earnings > 7500:
                        pt_amount = 175.0
                    else:
                        pt_amount = 0.0
                else:
                    # Generic default
                    pt_amount = 200.0 if gross_earnings >= 15000 else 0.0

            deductions['professional_tax'] = pt_amount
            deductions['details']['pt'] = {
                'state': emp_state,
                'pt_amount': pt_amount,
                'rule_id': pt_rule.id if pt_rule else 'Default Slabs'
            }

        # 4. TDS (Tax Deducted at Source)
        if employee.tds_applicable:
            # If annual projected salary > 700000 (New regime default threshold)
            annual_projected = gross_earnings * 12
            if annual_projected > 700000:
                monthly_taxable = (annual_projected - 75000) / 12 # Standard deduction 75,000
                tds_estimate = round(max(0, (monthly_taxable - 50000) * 0.05), 2)
                deductions['tds'] = tds_estimate
                deductions['details']['tds'] = {'projected_annual': annual_projected, 'monthly_tds': tds_estimate}
            else:
                deductions['details']['tds'] = {'projected_annual': annual_projected, 'monthly_tds': 0.0}

        return deductions
