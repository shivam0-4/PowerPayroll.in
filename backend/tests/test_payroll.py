from datetime import date

def test_full_payroll_lifecycle(client, admin_token):
    # 1. Create a Daily Wage Worker
    res_w1 = client.post('/api/employees', json={
        'emp_code': 'GP-PAY01',
        'full_name': 'Daily Worker One',
        'phone': '9444444441',
        'designation': 'Welder',
        'wage_type': 'daily_wage',
        'daily_wage_rate': 600.0,
        'pf_applicable': True,
        'esic_applicable': True,
        'pt_applicable': True
    }, headers={'Authorization': f'Bearer {admin_token}'})
    w1_id = res_w1.get_json()['employee']['id']

    # 2. Mark 20 days present with 4 hours overtime
    today = date.today()
    for day in range(1, 21):
        client.post('/api/attendance', json={
            'employee_id': w1_id,
            'date': date(today.year, today.month, day).isoformat(),
            'status': 'Present',
            'overtime_hours': 2.0 if day in [5, 10] else 0.0
        }, headers={'Authorization': f'Bearer {admin_token}'})

    # 3. Issue Advance of 3,000 with 1,000 monthly installment
    res_adv = client.post('/api/advances', json={
        'employee_id': w1_id,
        'amount': 3000.0,
        'monthly_installment': 1000.0,
        'reason': 'Festival Advance'
    }, headers={'Authorization': f'Bearer {admin_token}'})
    assert res_adv.status_code == 201

    # 4. Generate Payroll Period
    res_gen = client.post('/api/payroll/generate', json={
        'month': today.month,
        'year': today.year,
        'working_days': 26
    }, headers={'Authorization': f'Bearer {admin_token}'})
    assert res_gen.status_code == 200
    period_id = res_gen.get_json()['period']['id']

    # 5. Calculate Payroll
    res_calc = client.post(f'/api/payroll/{period_id}/calculate', headers={'Authorization': f'Bearer {admin_token}'})
    assert res_calc.status_code == 200
    period_data = res_calc.get_json()['period']
    assert period_data['status'] == 'Calculated'
    assert period_data['total_gross'] > 0
    assert period_data['total_net'] > 0

    # 6. Verify details of record
    res_details = client.get(f'/api/payroll/{period_id}', headers={'Authorization': f'Bearer {admin_token}'})
    records = res_details.get_json()['records']
    w1_record = next(r for r in records if r['employee_id'] == w1_id)
    assert w1_record['payable_days'] == 20.0
    assert w1_record['overtime_hours'] == 4.0
    
    # 7. Approve Payroll
    res_app = client.post(f'/api/payroll/{period_id}/approve', headers={'Authorization': f'Bearer {admin_token}'})
    assert res_app.status_code == 200
    assert res_app.get_json()['period']['status'] == 'Approved'

    # 8. Lock Payroll & verify payslip generation
    res_lock = client.post(f'/api/payroll/{period_id}/lock', headers={'Authorization': f'Bearer {admin_token}'})
    assert res_lock.status_code == 200
    assert res_lock.get_json()['period']['status'] == 'Locked'

    # 9. Verify recalculation fails when locked
    res_recalc = client.post(f'/api/payroll/{period_id}/calculate', headers={'Authorization': f'Bearer {admin_token}'})
    assert res_recalc.status_code == 400
    assert 'Cannot recalculate' in res_recalc.get_json()['error']
