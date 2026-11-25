from io import BytesIO


def test_create_employee_success(client, admin_token):
    payload = {
        'emp_code': 'GP-T001',
        'full_name': 'Rakesh Kumar',
        'phone': '9898989898',
        'designation': 'Welder',
        'wage_type': 'daily_wage',
        'daily_wage_rate': 650.0,
        'employment_category': 'Skilled Worker'
    }
    res = client.post('/api/employees', json=payload, headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 201
    data = res.get_json()['employee']
    assert data['emp_code'] == 'GP-T001'
    assert data['daily_wage_rate'] == 650.0

def test_prevent_duplicate_employee_code(client, admin_token):
    payload = {
        'emp_code': 'GP-DUP01',
        'full_name': 'Worker One',
        'phone': '9111111111',
        'designation': 'Helper'
    }
    res1 = client.post('/api/employees', json=payload, headers={'Authorization': f'Bearer {admin_token}'})
    assert res1.status_code == 201

    # Attempt to insert same code
    res2 = client.post('/api/employees', json=payload, headers={'Authorization': f'Bearer {admin_token}'})
    assert res2.status_code == 400
    assert 'already exists' in res2.get_json()['error']

def test_viewer_masks_sensitive_bank_data(client, admin_token, viewer_token):
    payload = {
        'emp_code': 'GP-MASK1',
        'full_name': 'Private Data Employee',
        'phone': '9222222222',
        'designation': 'Fitter',
        'bank_account_no': '123456789012',
        'pan': 'ABCDE1234F'
    }
    client.post('/api/employees', json=payload, headers={'Authorization': f'Bearer {admin_token}'})
    
    # As viewer
    res = client.get('/api/employees', headers={'Authorization': f'Bearer {viewer_token}'})
    assert res.status_code == 200
    emps = res.get_json()['employees']
    target = next(e for e in emps if e['emp_code'] == 'GP-MASK1')
    assert target['bank_account_no'].startswith('X')
    assert target['pan'].startswith('X')


def test_upload_employee_cv_and_download(client, app, admin_token, tmp_path):
    app.config['UPLOAD_FOLDER'] = str(tmp_path)
    employee_res = client.post(
        '/api/employees',
        json={'full_name': 'CV Worker', 'phone': '9000000000', 'designation': 'Fitter'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    employee_id = employee_res.get_json()['employee']['id']

    upload_res = client.post(
        f'/api/employees/{employee_id}/cv',
        data={'file': (BytesIO(b'%PDF test CV'), 'worker-cv.pdf')},
        headers={'Authorization': f'Bearer {admin_token}'},
        content_type='multipart/form-data'
    )

    assert upload_res.status_code == 201
    document = upload_res.get_json()['document']
    assert document['doc_type'] == 'CV'
    assert document['doc_name'] == 'worker-cv.pdf'

    employee = client.get(
        f'/api/employees/{employee_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    ).get_json()['employee']
    assert employee['documents'][0]['id'] == document['id']

    download_res = client.get(
        f"/api/employees/documents/{document['id']}/download",
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert download_res.status_code == 200
    assert download_res.data == b'%PDF test CV'


def test_reject_unsupported_employee_cv_file(client, admin_token):
    employee_res = client.post(
        '/api/employees',
        json={'full_name': 'CV Worker', 'phone': '9000000000', 'designation': 'Fitter'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    employee_id = employee_res.get_json()['employee']['id']

    upload_res = client.post(
        f'/api/employees/{employee_id}/cv',
        data={'file': (BytesIO(b'not a CV'), 'worker-cv.exe')},
        headers={'Authorization': f'Bearer {admin_token}'},
        content_type='multipart/form-data'
    )

    assert upload_res.status_code == 400
    assert 'PDF, DOC, or DOCX' in upload_res.get_json()['error']
