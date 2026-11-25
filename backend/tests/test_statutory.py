from app.models.employee import Employee
from app.services.statutory_engine import StatutoryEngine

def test_epf_ceiling_calculation(app):
    # Employee with basic 20,000 should be capped at ceiling of 15,000 (12% of 15,000 = 1800)
    emp = Employee(
        full_name='High Earner',
        pf_applicable=True,
        esic_applicable=False,
        pt_applicable=True
    )
    res = StatutoryEngine.calculate_statutory_deductions(
        employee=emp,
        gross_earnings=25000.0,
        basic_da_earnings=20000.0,
        state='Gujarat'
    )
    assert res['epf_employee'] == 1800.0
    assert res['esic_employee'] == 0.0 # Exempt

def test_esic_eligibility_and_calculation(app):
    # Employee with gross <= 21,000 gets 0.75% ESIC
    emp = Employee(
        full_name='Eligible ESIC Worker',
        pf_applicable=True,
        esic_applicable=True,
        pt_applicable=True
    )
    res = StatutoryEngine.calculate_statutory_deductions(
        employee=emp,
        gross_earnings=16000.0,
        basic_da_earnings=10000.0,
        state='Gujarat'
    )
    assert res['esic_employee'] == 120.0 # 0.75% of 16000
    assert res['epf_employee'] == 1200.0 # 12% of 10000
    assert res['professional_tax'] == 200.0 # Gross >= 12000 in Gujarat
