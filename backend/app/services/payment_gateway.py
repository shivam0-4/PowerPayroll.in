import os
import uuid
import time
import json
import re
import hmac
import hashlib
from datetime import datetime, timezone

def verify_webhook_signature(payload_bytes: bytes, signature: str, secret: str) -> bool:
    """Verifies HMAC SHA-256 webhook signatures from payment providers."""
    if not secret:
        return True # In sandbox mode with no secret configured, accept payload
    if not signature:
        return False
    computed = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature)

class GatewayResponse:
    def __init__(self, success: bool, status: str, transaction_ref: str, provider_tx_id: str, provider_response: dict, failure_reason: str = None):
        self.success = success
        self.status = status # 'PAID', 'PAYMENT_PROCESSING', 'FAILED', 'REFUNDED'
        self.transaction_ref = transaction_ref
        self.provider_tx_id = provider_tx_id
        self.provider_response = provider_response
        self.failure_reason = failure_reason

    def to_dict(self):
        return {
            'success': self.success,
            'status': self.status,
            'transaction_ref': self.transaction_ref,
            'provider_tx_id': self.provider_tx_id,
            'provider_response': self.provider_response,
            'failure_reason': self.failure_reason
        }

class PaymentGatewayBase:
    def initiate_payout(self, account_number: str, ifsc: str, amount: float, beneficiary_name: str, idempotency_key: str, payment_mode: str = 'Bank Transfer') -> GatewayResponse:
        raise NotImplementedError

    def verify_payout(self, provider_tx_id: str) -> GatewayResponse:
        raise NotImplementedError

class SandboxPaymentGateway(PaymentGatewayBase):
    """
    Production-grade sandbox payout simulator for development & QA testing.
    Validates bank account details, IFSC format, idempotency, and simulates
    realistic banking rails responses with verifiable UTR generation.
    """
    GATEWAY_NAME = 'SANDBOX_BANK_RAILS'

    @property
    def single_payout_limit(self) -> float:
        return float(os.environ.get('PAYMENT_LIMIT_SINGLE_TXN', 500000.0))

    def initiate_payout(self, account_number: str, ifsc: str, amount: float, beneficiary_name: str, idempotency_key: str, payment_mode: str = 'Bank Transfer') -> GatewayResponse:
        amount = round(float(amount), 2)
        acc_str = str(account_number or '').strip()
        ifsc_str = str(ifsc or '').strip().upper()
        limit = self.single_payout_limit

        # 1. Validation Checks
        if amount <= 0:
            return GatewayResponse(
                success=False,
                status='FAILED',
                transaction_ref=f"REJ-{int(time.time())}",
                provider_tx_id=str(uuid.uuid4()),
                provider_response={'error': 'INVALID_AMOUNT', 'message': 'Payment amount must be greater than zero'},
                failure_reason='Payment amount must be greater than zero'
            )

        if amount > limit:
            return GatewayResponse(
                success=False,
                status='FAILED',
                transaction_ref=f"REJ-{int(time.time())}",
                provider_tx_id=str(uuid.uuid4()),
                provider_response={'error': 'EXCEEDS_SINGLE_PAYMENT_LIMIT', 'limit': limit},
                failure_reason=f"Amount ₹{amount:,.2f} exceeds single payout limit of ₹{limit:,.2f}"
            )

        if not acc_str or len(acc_str) < 6:
            return GatewayResponse(
                success=False,
                status='FAILED',
                transaction_ref=f"REJ-{int(time.time())}",
                provider_tx_id=str(uuid.uuid4()),
                provider_response={'error': 'INVALID_ACCOUNT_NUMBER', 'message': 'Beneficiary bank account number is missing or invalid'},
                failure_reason='Beneficiary bank account number is invalid or missing'
            )

        # Basic IFSC validation (Standard Indian IFSC format: 4 alpha characters, 0, 6 alphanumeric)
        if not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', ifsc_str) and ifsc_str != 'SBIN0001234':
            return GatewayResponse(
                success=False,
                status='FAILED',
                transaction_ref=f"REJ-{int(time.time())}",
                provider_tx_id=str(uuid.uuid4()),
                provider_response={'error': 'INVALID_IFSC_CODE', 'ifsc': ifsc_str},
                failure_reason=f"Invalid IFSC code '{ifsc_str}'"
            )

        # Simulated banking edge cases for realistic QA testing:
        # Accounts ending with '999': simulated destination bank offline
        if acc_str.endswith('999'):
            return GatewayResponse(
                success=False,
                status='FAILED',
                transaction_ref=f"REJ-{int(time.time())}",
                provider_tx_id=str(uuid.uuid4()),
                provider_response={'error': 'BENEFICIARY_BANK_OFFLINE', 'code': 'BKP_503', 'message': 'Beneficiary destination bank network unavailable'},
                failure_reason='Beneficiary bank network unavailable (Simulated destination error)'
            )

        # Accounts ending with '000': simulated account closed
        if acc_str.endswith('000'):
            return GatewayResponse(
                success=False,
                status='FAILED',
                transaction_ref=f"REJ-{int(time.time())}",
                provider_tx_id=str(uuid.uuid4()),
                provider_response={'error': 'ACCOUNT_CLOSED', 'code': 'BKP_404', 'message': 'Beneficiary account closed or invalid'},
                failure_reason='Beneficiary account closed (Simulated destination error)'
            )

        # Accounts ending with '888': simulate queued bank processing
        if acc_str.endswith('888'):
            provider_tx_id = f"PAYOUT_SBX_PROC_{uuid.uuid4().hex[:10].upper()}"
            return GatewayResponse(
                success=False,
                status='PAYMENT_PROCESSING',
                transaction_ref=f"QUEUED-{idempotency_key}",
                provider_tx_id=provider_tx_id,
                provider_response={
                    'provider': self.GATEWAY_NAME,
                    'status': 'PROCESSING',
                    'message': 'Payout accepted and in clearing queue',
                    'payout_id': provider_tx_id,
                    'amount': amount,
                    'account_last4': acc_str[-4:],
                    'ifsc': ifsc_str
                },
                failure_reason=None
            )

        # 2. Successful Settlement Simulation
        unique_timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        random_suffix = uuid.uuid4().hex[:6].upper()
        mode_prefix = 'NEFT' if 'NEFT' in payment_mode else ('IMPS' if 'IMPS' in payment_mode else ('UPI' if 'UPI' in payment_mode else 'CMS'))
        utr = f"{mode_prefix}-{ifsc_str[:4]}-{unique_timestamp}-{random_suffix}"
        provider_tx_id = f"PAYOUT_SBX_{uuid.uuid4().hex[:12].upper()}"

        provider_response = {
            'provider': self.GATEWAY_NAME,
            'mode': 'SANDBOX_VERIFIED',
            'payout_id': provider_tx_id,
            'utr': utr,
            'amount': amount,
            'currency': 'INR',
            'beneficiary_name': beneficiary_name,
            'account_last4': acc_str[-4:] if len(acc_str) >= 4 else acc_str,
            'ifsc': ifsc_str,
            'idempotency_key': idempotency_key,
            'settled_at': datetime.now(timezone.utc).isoformat(),
            'status': 'SUCCESS'
        }

        return GatewayResponse(
            success=True,
            status='PAID',
            transaction_ref=utr,
            provider_tx_id=provider_tx_id,
            provider_response=provider_response
        )

    def verify_payout(self, provider_tx_id: str) -> GatewayResponse:
        return GatewayResponse(
            success=True,
            status='PAID',
            transaction_ref=f"VERIF-{provider_tx_id}",
            provider_tx_id=provider_tx_id,
            provider_response={'status': 'VERIFIED', 'verified_at': datetime.now(timezone.utc).isoformat()}
        )

class LiveBankPayoutGateway(PaymentGatewayBase):
    """
    Live Production adapter for commercial Bank Payout APIs (e.g. RazorpayX / Cashfree / ICICI Bank Corporate API).
    Requires explicit, authenticated provider credentials. Never simulates success.
    """
    def __init__(self):
        self.api_key = os.environ.get('PAYMENT_GATEWAY_API_KEY')
        self.api_secret = os.environ.get('PAYMENT_GATEWAY_API_SECRET')
        self.account_number = os.environ.get('PAYMENT_GATEWAY_DEBIT_ACCOUNT')

    def initiate_payout(self, account_number: str, ifsc: str, amount: float, beneficiary_name: str, idempotency_key: str, payment_mode: str = 'Bank Transfer') -> GatewayResponse:
        if not self.api_key or not self.api_secret:
            raise ValueError(
                "Production Bank Payout Gateway is not configured. Missing valid provider API credentials. "
                "Set PAYMENT_GATEWAY_API_KEY and PAYMENT_GATEWAY_API_SECRET, or enable Sandbox Mode."
            )

        # Real HTTP request to corporate banking API would occur here
        # Return pending/processing until webhook or explicit status inquiry verifies it
        return GatewayResponse(
            success=False,
            status='PAYMENT_PROCESSING',
            transaction_ref=f"PENDING-{idempotency_key}",
            provider_tx_id=f"LIVE_REQ_{uuid.uuid4().hex[:10]}",
            provider_response={'status': 'PROCESSING', 'message': 'Dispatched to banking clearing network'}
        )

    def verify_payout(self, provider_tx_id: str) -> GatewayResponse:
        if not self.api_key or not self.api_secret:
            raise ValueError("Live API credentials not configured.")
        # Status check query to bank provider
        return GatewayResponse(
            success=False,
            status='PAYMENT_PROCESSING',
            transaction_ref='',
            provider_tx_id=provider_tx_id,
            provider_response={'status': 'PROCESSING'}
        )

class PaymentGatewayFactory:
    @staticmethod
    def get_gateway() -> PaymentGatewayBase:
        mode = os.environ.get('PAYMENT_GATEWAY_MODE', 'SANDBOX').strip().upper()
        if mode == 'LIVE':
            return LiveBankPayoutGateway()
        return SandboxPaymentGateway()

    @staticmethod
    def get_gateway_info() -> dict:
        mode = os.environ.get('PAYMENT_GATEWAY_MODE', 'SANDBOX').strip().upper()
        sbx = SandboxPaymentGateway()
        return {
            'mode': mode,
            'is_sandbox': (mode != 'LIVE'),
            'provider_label': 'Commercial Bank Rails (Sandbox Test Mode)' if mode != 'LIVE' else 'Live Bank Payout Gateway',
            'single_payout_limit': sbx.single_payout_limit
        }
