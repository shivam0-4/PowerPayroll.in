import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { SalaryPayment, PaymentReceiptData } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  User,
  Clock,
  ArrowRight,
  FileCheck,
} from 'lucide-react';

interface SinglePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: SalaryPayment | null;
  onSuccess: () => void;
  onViewReceipt?: (receipt: PaymentReceiptData) => void;
}

export const SinglePayModal: React.FC<SinglePayModalProps> = ({
  isOpen,
  onClose,
  payment,
  onSuccess,
  onViewReceipt,
}) => {
  const [payType, setPayType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<PaymentReceiptData | null>(null);
  const [completedTx, setCompletedTx] = useState<any | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (payment) {
      setPayType('FULL');
      const rem = payment.remaining_amount !== undefined ? payment.remaining_amount : payment.amount;
      setPartialAmount(rem.toString());
      setPaymentMode(payment.payment_mode || 'Bank Transfer');
      setNotes('');
      setLastReceipt(null);
      setCompletedTx(null);
    }
  }, [payment, isOpen]);

  if (!payment) return null;

  const currentRemaining = payment.remaining_amount !== undefined
    ? payment.remaining_amount
    : Math.max(0, payment.amount - (payment.paid_amount || 0));

  const payableAmount = payType === 'FULL'
    ? currentRemaining
    : Math.min(Number(partialAmount) || 0, currentRemaining);

  const balanceAfter = Math.max(0, currentRemaining - payableAmount);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payableAmount <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }
    if (payableAmount > currentRemaining + 0.01) {
      showToast(`Amount exceeds pending dues of ₹${currentRemaining.toLocaleString('en-IN')}`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.initiateSinglePayment(payment.id, {
        amount: payableAmount,
        payment_mode: paymentMode,
        notes: notes || undefined,
      });

      if (res.status === 'PAID') {
        showToast(`Settlement successful! Ref: ${res.transaction_ref}`, 'success');
        setCompletedTx(res.transaction);

        // Fetch printable receipt
        if (res.transaction?.id) {
          try {
            const rRes = await api.getPaymentReceipt(res.transaction.id);
            setLastReceipt(rRes.receipt);
          } catch (rErr) {
            console.error('Failed to load receipt:', rErr);
          }
        }
        onSuccess();
      } else if (res.status === 'PAYMENT_PROCESSING') {
        showToast('Payment initiated and queued in banking processing network', 'info');
        setCompletedTx(res.transaction);
        onSuccess();
      } else {
        showToast(res.failure_reason || 'Payment failed at gateway', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Payment initiation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Salary Settlement"
      subtitle={`Settle dues for ${payment.employee_name || 'Worker'} (${payment.emp_code || `EMP-${payment.id}`})`}
      maxWidth="md"
    >
      {completedTx ? (
        <div className="space-y-4 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-emerald-950">
              Salary Payment Settled Successfully
            </h3>
            <p className="text-emerald-700 mt-1">
              ₹{completedTx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} transferred via {completedTx.payment_mode}
            </p>
            <div className="mt-3 bg-white border border-emerald-200 rounded-xl p-3 font-mono text-[11px] text-slate-700">
              <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Transaction UTR / Ref</span>
              <span className="font-bold text-slate-900 select-all">{completedTx.transaction_ref}</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Close
            </button>
            {lastReceipt && onViewReceipt && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewReceipt(lastReceipt);
                }}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl shadow-md flex items-center space-x-1.5 transition"
              >
                <FileCheck className="w-4 h-4" />
                <span>View / Print Receipt</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handlePay} className="space-y-4 text-xs">
          {/* Employee & Bank Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-slate-900 text-sm block">{payment.employee_name}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {payment.emp_code} • {payment.department || 'N/A'} • {payment.period_label || payment.salary_month}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {payment.status}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Bank Account:</span>
                <span className="font-mono font-bold text-slate-800">
                  {payment.bank_account_no ? `•••• ${payment.bank_account_no.slice(-4)}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">IFSC Code:</span>
                <span className="font-mono font-bold text-slate-800">{payment.bank_ifsc || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Dues Breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Salary</span>
              <span className="text-xs font-bold text-slate-700">
                ₹{payment.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-600 uppercase font-bold block">Already Paid</span>
              <span className="text-xs font-bold text-emerald-700">
                ₹{(payment.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[10px] text-amber-600 uppercase font-bold block">Remaining Due</span>
              <span className="text-xs font-black text-amber-700">
                ₹{currentRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Pay Type Choice */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">Settlement Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayType('FULL')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  payType === 'FULL'
                    ? 'bg-brand-900 text-gold-400 border-brand-800 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Pay Full Balance (₹{currentRemaining.toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                onClick={() => setPayType('PARTIAL')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  payType === 'PARTIAL'
                    ? 'bg-brand-900 text-gold-400 border-brand-800 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Pay Partial Amount
              </button>
            </div>
          </div>

          {/* Partial Amount Input */}
          {payType === 'PARTIAL' && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Amount to Settle (₹)
              </label>
              <input
                type="number"
                min="1"
                max={currentRemaining}
                step="0.01"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm"
                required
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Max payable: ₹{currentRemaining.toLocaleString('en-IN')}</span>
                <span className="text-amber-600 font-semibold">
                  Balance remaining after: ₹{balanceAfter.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Payment Mode */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Payment Method / Rail</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
            >
              <option value="Bank Transfer">Bank Transfer (NEFT - National Electronic Fund Transfer)</option>
              <option value="IMPS">IMPS (Immediate Payment Service - Real-time)</option>
              <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
              <option value="UPI">UPI / VPA Instant Transfer</option>
              <option value="Direct Bank Payout Gateway">Corporate Banking API Gateway</option>
              <option value="Cash">Direct Cash (Requires Physical Receipt)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Disbursal Remarks (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. November salary settlement"
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || payableAmount <= 0}
              className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl shadow-md flex items-center space-x-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                  <span>Settling via Bank Rails...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Confirm Pay ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
