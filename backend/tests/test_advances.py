def test_advance_and_repayment_workflow(client, admin_token):
    # Create employee
    res_emp = client.post('/api/employees', json={
        'emp_code': 'GP-ADV01',
        'full_name': 'Advance Worker',
        'phone': '9555555551',
        'designation': 'Fitter',
        'daily_wage_rate': 600.0
    }, headers={'Authorization': f'Bearer {admin_token}'})
    emp_id = res_emp.get_json()['employee']['id']

    # Issue Advance
    res_adv = client.post('/api/advances', json={
        'employee_id': emp_id,
        'amount': 4000.0,
        'monthly_installment': 1000.0,
        'reason': 'Home repairs'
    }, headers={'Authorization': f'Bearer {admin_token}'})
    assert res_adv.status_code == 201
    adv_id = res_adv.get_json()['advance']['id']
    assert res_adv.get_json()['advance']['remaining_amount'] == 4000.0

    # Direct repayment of 1500
    res_rep = client.post(f'/api/advances/{adv_id}/repay', json={
        'amount': 1500.0,
        'payment_mode': 'Cash',
        'notes': 'Partial cash repayment'
    }, headers={'Authorization': f'Bearer {admin_token}'})
    assert res_rep.status_code == 200
    assert res_rep.get_json()['repayment']['remaining_balance_after'] == 2500.0
