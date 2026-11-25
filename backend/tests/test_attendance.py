from datetime import date

def test_mark_and_retrieve_attendance(client, admin_token):
    # 1. Create employee
    res_emp = client.post('/api/employees', json={
        'emp_code': 'GP-ATT01',
        'full_name': 'Attendance Tester',
        'phone': '9333333333',
        'designation': 'Operator',
        'wage_type': 'daily_wage',
        'daily_wage_rate': 600.0
    }, headers={'Authorization': f'Bearer {admin_token}'})
    emp_id = res_emp.get_json()['employee']['id']

    # 2. Mark Present
    today_str = date.today().isoformat()
    res_att = client.post('/api/attendance', json={
        'employee_id': emp_id,
        'date': today_str,
        'status': 'Present',
        'working_hours': 8.0,
        'overtime_hours': 2.0
    }, headers={'Authorization': f'Bearer {admin_token}'})
    assert res_att.status_code == 200

    # 3. Retrieve daily register
    res_get = client.get(f'/api/attendance?date={today_str}', headers={'Authorization': f'Bearer {admin_token}'})
    assert res_get.status_code == 200
    records = res_get.get_json()['records']
    emp_att = next(r for r in records if r['employee_id'] == emp_id)
    assert emp_att['status'] == 'Present'
    assert emp_att['overtime_hours'] == 2.0
