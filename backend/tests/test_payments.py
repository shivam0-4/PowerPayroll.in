"""
Tests for One-Tap Pending Dues Payment Feature.
Covers the complete payment lifecycle:
- Payment summary endpoint
- Pending payment listing
- Individual payment initiation (full and partial)
- Bulk payment initiation (independent settlement)
- Payment history and receipt
- Webhook processing
- Reconciliation summary
"""
import pytest
from datetime import date

# ─────────────────────────────────────────────────────────────
# Helpers / Fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def payment_data(client, admin_token):
    """
    Creates payroll test data via API: 2 employees, 1 period, calculate + lock.
    Returns their payment IDs.
    """
    today = date.today()

    # Employee 1: valid bank details → will succeed through Sandbox gateway
    r1 = client.post('/api/employees', json={
        'emp_code': 'GP-PMTST01',
        'full_name': 'Paytest Kumar',
        'phone': '9100000001',
        'designation': 'Welder',
        'wage_type': 'daily_wage',
        'daily_wage_rate': 500.0,
        'bank_account_no': '123456789012',
        'bank_ifsc': 'SBIN0001234',
        'bank_name': 'SBI',
        'pf_applicable': True,
        'esic_applicable': True,
        'pt_applicable': True
    }, headers={'Authorization': f'Bearer {admin_token}'})
    assert r1.status_code == 201, r1.get_data(as_text=True)
    emp1_id = r1.get_json()['employee']['id']

    # Employee 2: account ending with '999' → Sandbox simulates FAILED
    r2 = client.post('/api/employees', json={
        'emp_code': 'GP-PMTST02',
        'full_name': 'Failtest Sharma',
        'phone': '9100000002',
        'designation': 'Helper',
        'wage_type': 'daily_wage',
        'daily_wage_rate': 300.0,
        'bank_account_no': '987654321999',  # ends with 999 -> FAILED
        'bank_ifsc': 'HDFC0001234',
        'bank_name': 'HDFC',
        'pf_applicable': True,
        'esic_applicable': True,
        'pt_applicable': True
    }, headers={'Authorization': f'Bearer {admin_token}'})
    assert r2.status_code == 201, r2.get_data(as_text=True)
    emp2_id = r2.get_json()['employee']['id']

    # Mark attendance for both employees
    for emp_id in [emp1_id, emp2_id]:
        for day in range(1, 21):
            d = date(today.year, today.month, day)
            client.post('/api/attendance', json={
                'employee_id': emp_id,
                'date': d.isoformat(),
                'status': 'Present'
            }, headers={'Authorization': f'Bearer {admin_token}'})

    # Generate and calculate payroll
    r_gen = client.post('/api/payroll/generate', json={
        'month': today.month,
        'year': today.year,
        'working_days': 26
    }, headers={'Authorization': f'Bearer {admin_token}'})
    assert r_gen.status_code == 200
    period_id = r_gen.get_json()['period']['id']

    r_calc = client.post(f'/api/payroll/{period_id}/calculate',
                         headers={'Authorization': f'Bearer {admin_token}'})
    assert r_calc.status_code == 200

    # Approve and lock payroll (which creates SalaryPayment records)
    client.post(f'/api/payroll/{period_id}/approve',
                headers={'Authorization': f'Bearer {admin_token}'})
    client.post(f'/api/payroll/{period_id}/lock',
                headers={'Authorization': f'Bearer {admin_token}'})

    # Retrieve payment IDs from the payments endpoint
    r_pay = client.get(f'/api/payments?period_id={period_id}',
                       headers={'Authorization': f'Bearer {admin_token}'})
    assert r_pay.status_code == 200
    payments = r_pay.get_json()['payments']
    assert len(payments) >= 2

    # Map employee to payment
    pay_by_emp = {p['employee_id']: p['id'] for p in payments}

    return {
        'period_id': period_id,
        'emp1_id': emp1_id,
        'emp2_id': emp2_id,
        'pay1_id': pay_by_emp[emp1_id],
        'pay2_id': pay_by_emp[emp2_id],
        'payments': payments
    }


# ─────────────────────────────────────────────────────────────
# 1. Payment Summary Endpoint
# ─────────────────────────────────────────────────────────────

def test_payment_summary(client, admin_token, payment_data):
    res = client.get('/api/payments/summary',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert 'summary' in body
    s = body['summary']
    assert 'total_pending_amount' in s
    assert s['total_pending_amount'] > 0
    assert 'pending_employees_count' in s
    assert s['pending_employees_count'] >= 2
    assert 'fully_paid_count' in s
    assert 'overdue_count' in s
    assert 'partially_paid_count' in s
    assert 'gateway_info' in s
    # Must be sandbox in test environment
    assert s['gateway_info']['is_sandbox'] is True


# ─────────────────────────────────────────────────────────────
# 2. Pending Payments Listing
# ─────────────────────────────────────────────────────────────

def test_get_pending_payments(client, admin_token, payment_data):
    res = client.get('/api/payments/pending',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert 'pending_payments' in body
    assert body['count'] >= 2
    assert body['total_pending_amount'] > 0

def test_pending_payments_filter_by_period(client, admin_token, payment_data):
    period_id = payment_data['period_id']
    res = client.get(f'/api/payments/pending?period_id={period_id}',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert body['count'] >= 2


# ─────────────────────────────────────────────────────────────
# 3. Individual Payment Initiation (Full)
# ─────────────────────────────────────────────────────────────

def test_initiate_single_payment_full(client, admin_token, payment_data):
    pay_id = payment_data['pay1_id']
    res = client.post(
        f'/api/payments/{pay_id}/initiate',
        json={'payment_mode': 'Bank Transfer'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body['status'] == 'PAID'
    assert body['amount_paid'] > 0
    assert body['remaining_balance'] == 0.0
    assert 'transaction_ref' in body
    pmt = body['payment']
    assert pmt['status'] == 'PAID'
    assert pmt['remaining_amount'] == 0.0

def test_initiate_single_payment_partial(client, admin_token, payment_data):
    pay_id = payment_data['pay1_id']
    # Determine the net salary from payments list
    payments = payment_data['payments']
    p1 = next(p for p in payments if p['id'] == pay_id)
    full_amount = p1['net_payable']
    partial = round(full_amount / 2, 2)

    res = client.post(
        f'/api/payments/{pay_id}/initiate',
        json={'amount': partial, 'payment_mode': 'NEFT'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body['status'] == 'PAID'
    assert abs(body['amount_paid'] - partial) < 0.01
    assert body['remaining_balance'] > 0

    # Payment status should be PARTIALLY_PAID
    pmt = body['payment']
    assert pmt['status'] == 'PARTIALLY_PAID'

def test_initiate_payment_exceeds_remaining(client, admin_token, payment_data):
    pay_id = payment_data['pay1_id']
    res = client.post(
        f'/api/payments/{pay_id}/initiate',
        json={'amount': 999999999.0, 'payment_mode': 'Bank Transfer'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res.status_code == 400
    assert 'error' in res.get_json()

def test_initiate_payment_already_paid(client, admin_token, payment_data):
    """Initiating payment on already-fully-paid record should raise error."""
    pay_id = payment_data['pay1_id']
    # Pay it fully first
    client.post(f'/api/payments/{pay_id}/initiate',
                json={'payment_mode': 'Bank Transfer'},
                headers={'Authorization': f'Bearer {admin_token}'})
    # Then try again
    res = client.post(f'/api/payments/{pay_id}/initiate',
                      json={'payment_mode': 'Bank Transfer'},
                      headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 400
    assert 'error' in res.get_json()

def test_initiate_payment_gateway_failure(client, admin_token, payment_data):
    """
    Employee with account ending '999' triggers simulated gateway failure.
    Status must be FAILED; never marked PAID without gateway confirmation.
    Critical business rule.
    """
    pay_id = payment_data['pay2_id']
    res = client.post(
        f'/api/payments/{pay_id}/initiate',
        json={'payment_mode': 'Bank Transfer'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res.status_code == 200
    body = res.get_json()
    # Payment must be FAILED from gateway
    assert body['status'] == 'FAILED'
    pmt = body['payment']
    # Critical: payment must NOT be marked PAID
    assert pmt['status'] != 'PAID'


# ─────────────────────────────────────────────────────────────
# 4. Bulk Payment Initiation (One-Tap)
# ─────────────────────────────────────────────────────────────

def test_bulk_initiate_independent_settlement(client, admin_token, payment_data):
    """
    Critical Business Rule:
    - pay1 (valid bank) → PAID
    - pay2 (account ending 999) → FAILED
    Batch is NOT treated as all-successful; each is settled independently.
    """
    pay_id_1 = payment_data['pay1_id']
    pay_id_2 = payment_data['pay2_id']

    res = client.post(
        '/api/payments/bulk-initiate',
        json={
            'payment_ids': [pay_id_1, pay_id_2],
            'payment_mode': 'Bank Transfer'
        },
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res.status_code == 200
    body = res.get_json()

    assert body['total_requested'] == 2
    assert body['successful_count'] == 1
    assert body['failed_count'] == 1

    # Independent results
    results_map = {r['payment_id']: r for r in body['results']}

    # pay1 must be PAID
    assert results_map[pay_id_1]['status'] == 'PAID'
    # pay2 must be FAILED
    assert results_map[pay_id_2]['status'] == 'FAILED'

def test_bulk_initiate_no_ids(client, admin_token):
    res = client.post(
        '/api/payments/bulk-initiate',
        json={'payment_ids': []},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res.status_code == 400

def test_bulk_initiate_role_restricted(client, viewer_token, payment_data):
    """Viewer role must not be able to initiate payments."""
    res = client.post(
        '/api/payments/bulk-initiate',
        json={'payment_ids': [payment_data['pay1_id']]},
        headers={'Authorization': f'Bearer {viewer_token}'}
    )
    assert res.status_code == 403


# ─────────────────────────────────────────────────────────────
# 5. Idempotency Protection (No Duplicate Charges)
# ─────────────────────────────────────────────────────────────

def test_payment_idempotency(client, admin_token, payment_data):
    """
    Duplicate payment with same idempotency_key must not double-charge.
    """
    pay_id = payment_data['pay1_id']
    idem_key = f"TEST-IDEMP-{pay_id}-001"

    res1 = client.post(
        f'/api/payments/{pay_id}/initiate',
        json={'payment_mode': 'Bank Transfer', 'idempotency_key': idem_key},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res1.status_code == 200
    assert res1.get_json()['status'] == 'PAID'

    # Second attempt with same key → already processed or error
    res2 = client.post(
        f'/api/payments/{pay_id}/initiate',
        json={'payment_mode': 'Bank Transfer', 'idempotency_key': idem_key},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res2.status_code in [200, 400]
    body2 = res2.get_json()
    if res2.status_code == 200:
        assert body2.get('status') in ['ALREADY_PROCESSED', 'PAID']


# ─────────────────────────────────────────────────────────────
# 6. Payment History
# ─────────────────────────────────────────────────────────────

def test_get_payment_history_empty(client, admin_token):
    res = client.get('/api/payments/history',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert 'history' in body
    assert isinstance(body['history'], list)

def test_get_payment_history_after_payment(client, admin_token, payment_data):
    pay_id = payment_data['pay1_id']
    client.post(f'/api/payments/{pay_id}/initiate',
                json={'payment_mode': 'Bank Transfer'},
                headers={'Authorization': f'Bearer {admin_token}'})

    res = client.get('/api/payments/history',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert body['total'] >= 1
    # Each transaction in history must have required fields
    tx = body['history'][0]
    assert 'transaction_ref' in tx
    assert 'status' in tx
    assert 'amount' in tx
    assert 'employee_name' in tx
    assert 'salary_month' in tx

def test_payment_history_filters(client, admin_token, payment_data):
    pay_id = payment_data['pay1_id']
    client.post(f'/api/payments/{pay_id}/initiate',
                json={'payment_mode': 'Bank Transfer'},
                headers={'Authorization': f'Bearer {admin_token}'})

    # Filter by PAID status
    res = client.get('/api/payments/history?status=PAID',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    for tx in body['history']:
        assert tx['status'] == 'PAID'


# ─────────────────────────────────────────────────────────────
# 7. Payment Status Check
# ─────────────────────────────────────────────────────────────

def test_payment_status_check(client, admin_token, payment_data):
    pay_id = payment_data['pay1_id']
    res = client.get(f'/api/payments/{pay_id}/status',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert 'payment' in body
    assert 'transactions' in body
    assert isinstance(body['transactions'], list)

def test_payment_status_not_found(client, admin_token):
    res = client.get('/api/payments/9999/status',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 404


# ─────────────────────────────────────────────────────────────
# 8. Payment Receipt
# ─────────────────────────────────────────────────────────────

def test_payment_receipt(client, admin_token, payment_data):
    pay_id = payment_data['pay1_id']
    # Initiate payment to create transaction
    res_init = client.post(
        f'/api/payments/{pay_id}/initiate',
        json={'payment_mode': 'NEFT'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert res_init.status_code == 200
    body_init = res_init.get_json()
    tx_id = body_init['transaction']['id']

    # Fetch receipt
    res_receipt = client.get(f'/api/payments/receipt/{tx_id}',
                             headers={'Authorization': f'Bearer {admin_token}'})
    assert res_receipt.status_code == 200
    receipt = res_receipt.get_json()['receipt']
    assert receipt['receipt_number'].startswith('RCP-')
    assert receipt['amount'] > 0
    assert 'employee' in receipt
    assert 'payroll_details' in receipt
    assert 'company' in receipt
    # Bank account should be masked
    masked = receipt['employee']['bank_account_masked']
    assert masked != ''

def test_payment_receipt_not_found(client, admin_token):
    res = client.get('/api/payments/receipt/9999',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 404


# ─────────────────────────────────────────────────────────────
# 9. Webhook Processing
# ─────────────────────────────────────────────────────────────

def test_webhook_payment_settled(client, admin_token, app, payment_data):
    """
    Simulates a provider webhook for successful settlement.
    Transaction must transition to PAID and payment balance updated.
    """
    from app.database import db
    from app.models.payroll import SalaryPayment, PaymentTransaction
    from datetime import datetime, timezone

    pay_id = payment_data['pay1_id']

    with app.app_context():
        payment = db.session.get(SalaryPayment, pay_id)
        # Inject a PAYMENT_PROCESSING transaction manually
        tx = PaymentTransaction(
            salary_payment_id=pay_id,
            transaction_ref='PROC-TX-001',
            idempotency_key=f'WHK-IDEMP-{pay_id}',
            amount=payment.amount,
            payment_mode='NEFT',
            status='PAYMENT_PROCESSING',
            provider='BANK_GATEWAY',
            provider_tx_id='LIVE_REQ_ABCDEF1234',
            initiated_at=datetime.now(timezone.utc)
        )
        db.session.add(tx)
        db.session.commit()

    # Send webhook settlement notification
    webhook_payload = {
        'event': 'SETTLED',
        'provider_tx_id': 'LIVE_REQ_ABCDEF1234',
        'idempotency_key': f'WHK-IDEMP-{pay_id}',
        'utr': 'NEFT-SBIN-20261125-XYZ123',
        'amount': payment_data['payments'][0]['net_payable']
    }
    res = client.post('/api/payments/webhook',
                      json=webhook_payload,
                      content_type='application/json')
    assert res.status_code == 200
    body = res.get_json()
    assert body['processed'] is True
    assert body['status'] == 'PAID'
    assert body['payment_status'] == 'PAID'
    assert body['remaining_balance'] <= 0.0

def test_webhook_payment_failed(client, admin_token, app, payment_data):
    from app.database import db
    from app.models.payroll import SalaryPayment, PaymentTransaction
    from datetime import datetime, timezone

    pay_id = payment_data['pay2_id']
    with app.app_context():
        payment = db.session.get(SalaryPayment, pay_id)
        tx = PaymentTransaction(
            salary_payment_id=pay_id,
            transaction_ref='FAIL-TX-001',
            idempotency_key=f'WHK-FAIL-{pay_id}',
            amount=payment.amount,
            payment_mode='NEFT',
            status='PAYMENT_PROCESSING',
            provider='BANK_GATEWAY',
            provider_tx_id='FAIL_REQ_ABCDEF9999',
            initiated_at=datetime.now(timezone.utc)
        )
        db.session.add(tx)
        db.session.commit()

    webhook_payload = {
        'event': 'FAILED',
        'provider_tx_id': 'FAIL_REQ_ABCDEF9999',
        'idempotency_key': f'WHK-FAIL-{pay_id}',
        'reason': 'Insufficient funds in debit account'
    }
    res = client.post('/api/payments/webhook', json=webhook_payload)
    assert res.status_code == 200
    body = res.get_json()
    assert body['status'] == 'FAILED'
    # Payment must NOT be PAID
    assert body['payment_status'] != 'PAID'

def test_webhook_unknown_transaction(client):
    res = client.post('/api/payments/webhook',
                      json={'event': 'SETTLED', 'provider_tx_id': 'NONEXISTENT_TX_999'})
    assert res.status_code == 400


# ─────────────────────────────────────────────────────────────
# 10. Reconciliation Summary
# ─────────────────────────────────────────────────────────────

def test_reconciliation_summary(client, admin_token, payment_data):
    res = client.get('/api/payments/reconciliation',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert 'reconciliation' in body
    recon = body['reconciliation']
    assert 'total_salary_payable' in recon
    assert 'total_settled_amount' in recon
    assert 'settlement_rate_percent' in recon
    assert recon['total_salary_payable'] >= 0.0

def test_reconciliation_after_payment(client, admin_token, payment_data):
    pay_id = payment_data['pay1_id']
    res_init = client.post(f'/api/payments/{pay_id}/initiate',
                           json={'payment_mode': 'Bank Transfer'},
                           headers={'Authorization': f'Bearer {admin_token}'})
    paid_amount = res_init.get_json()['amount_paid']

    res = client.get('/api/payments/reconciliation',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    recon = res.get_json()['reconciliation']
    assert recon['total_settled_amount'] >= paid_amount
    assert recon['paid_transactions_count'] >= 1


# ─────────────────────────────────────────────────────────────
# 11. Payments List (Legacy endpoint compatibility)
# ─────────────────────────────────────────────────────────────

def test_get_payments_requires_auth(client):
    res = client.get('/api/payments')
    assert res.status_code == 401

def test_get_payments_list(client, admin_token, payment_data):
    res = client.get('/api/payments',
                     headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert 'payments' in body
    assert 'summary' in body
    assert body['summary']['total_records'] >= 2


# ─────────────────────────────────────────────────────────────
# 12. Partial payment → Second payment → Full settlement
# ─────────────────────────────────────────────────────────────

def test_multiple_partial_payments_full_settlement(client, admin_token, payment_data):
    """
    Multiple payment transactions for the same salary period are supported.
    After paying in two installments, payment.status must be PAID.
    """
    pay_id = payment_data['pay1_id']
    payments = payment_data['payments']
    p1 = next(p for p in payments if p['id'] == pay_id)
    full_amount = p1['net_payable']
    installment = round(full_amount / 2.0, 2)

    # First partial payment
    res1 = client.post(f'/api/payments/{pay_id}/initiate',
                       json={'amount': installment, 'payment_mode': 'NEFT'},
                       headers={'Authorization': f'Bearer {admin_token}'})
    assert res1.status_code == 200
    b1 = res1.get_json()
    assert b1['payment']['status'] == 'PARTIALLY_PAID'

    # Second payment for remaining balance
    res2 = client.post(f'/api/payments/{pay_id}/initiate',
                       json={'payment_mode': 'NEFT'},
                       headers={'Authorization': f'Bearer {admin_token}'})
    assert res2.status_code == 200
    b2 = res2.get_json()
    assert b2['payment']['status'] == 'PAID'
    assert b2['payment']['remaining_amount'] <= 0.0
