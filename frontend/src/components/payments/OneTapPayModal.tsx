import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { SalaryPayment, BulkPaymentResponse, PaymentReceiptData } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  CheckSquare,
  Square,
  RefreshCw,
  FileCheck,
  Building,
  Zap,
} from 'lucide-react';

interface OneTapPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodId?: number | null;
  onSuccess: () => void;
  onViewReceipt?: (receipt: PaymentReceiptData) => void;
}

export const OneTapPayModal: React.FC<OneTapPayModalProps> = ({
  isOpen,
  onClose,
  periodId,
  onSuccess,
  onViewReceipt,
}) => {
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<SalaryPayment[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [confirmedRisk, setConfirmedRisk] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [bulkResponse, setBulkResponse] = useState<BulkPaymentResponse | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPending();
      setConfirmedRisk(false);
      setBulkResponse(null);
    }
  }, [isOpen, periodId]);

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await api.getPendingPayments(periodId || undefined);
      const list = res.pending_payments || [];
      setPendingPayments(list);
      // Default to select all eligible pending dues
      setSelectedIds(list.map((p: SalaryPayment) => p.id));
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch pending dues', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === pendingPayments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingPayments.map((p) => p.id));
    }
  };

  const handleToggleOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((pId) => pId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedPayments = pendingPayments.filter((p) => selectedIds.includes(p.id));
  const totalPayable = selectedPayments.reduce((acc, p) => acc + (p.remaining_amount || p.amount), 0);

  const handleExecuteBulk = async () => {
    if (selectedIds.length === 0) {
      showToast('Select at least one employee for payout', 'error');
      return;
    }
    if (!confirmedRisk) {
      showToast('Please confirm the authorization checklist before executing payment', 'error');
      return;
    }

    try {
      setProcessing(true);
      const res: BulkPaymentResponse = await api.bulkInitiatePayments({
        payment_ids: selectedIds,
        payment_mode: paymentMode,
      });

      setBulkResponse(res);
      showToast(
        `Batch processed: ${res.successful_count} successful, ${res.failed_count} failed`,
        res.failed_count === 0 ? 'success' : 'info'
      );
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Bulk payment initiation failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="One-Tap Pending Dues Settlement"
      subtitle="Corporate Banking Payment Initiation & Multi-Worker Direct Settlement"
      maxWidth="xl"
    >
      {/* View 1: Execution Completed Results */}
      {bulkResponse ? (
        <div className="space-y-5 text-xs">
          {/* Summary Status Header */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Requested</span>
              <span className="text-xl font-black text-slate-900">{bulkResponse.total_requested}</span>
              <span className="text-[10px] text-slate-500 block">Workers in batch</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
              <span className="text-[10px] text-emerald-600 font-bold uppercase block">Settled (PAID)</span>
              <span className="text-xl font-black text-emerald-700">{bulkResponse.successful_count}</span>
              <span className="text-[10px] text-emerald-600 font-semibold block">Confirmed by Bank</span>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              bulkResponse.failed_count > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-bold uppercase block ${
                bulkResponse.failed_count > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}>
                Failed Attempts
              </span>
              <span className={`text-xl font-black ${
                bulkResponse.failed_count > 0 ? 'text-rose-700' : 'text-slate-700'
              }`}>
                {bulkResponse.failed_count}
              </span>
              <span className="text-[10px] text-slate-500 block">Independent statuses</span>
            </div>

            <div className="bg-brand-950 text-white p-3.5 rounded-xl border border-brand-800">
              <span className="text-[10px] text-gold-400 font-bold uppercase block">Total Settled</span>
              <span className="text-lg font-black text-white">
                ₹{bulkResponse.total_settled_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-brand-300 block">Disbursed successfully</span>
            </div>
          </div>

          {/* Audit Rule Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start space-x-2 text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <strong>Independent Settlement Verified:</strong> In accordance with statutory payroll auditing,
              each worker was processed independently against banking rails. Successes were permanently settled
              while failed attempts remain open for re-initiation.
            </div>
          </div>

          {/* Detailed Itemized Results List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Worker ID & Name</th>
                  <th className="py-2.5 px-3 text-right">Settled Amount</th>
                  <th className="py-2.5 px-3">Bank UTR Reference</th>
                  <th className="py-2.5 px-3 text-center">Settlement Status</th>
                  <th className="py-2.5 px-3">Notes / Failure Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bulkResponse.results.map((r) => (
                  <tr key={r.payment_id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      <span className="font-mono text-brand-900 mr-1.5">{r.emp_code}</span>
                      <span>{r.employee_name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {r.transaction_ref || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center space-x-1 ${
                        r.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : r.status === 'FAILED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.status === 'PAID' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      {r.failure_reason || 'Settled and verified on banking network'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Action */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl shadow-md text-xs transition"
            >
              Done & Return to Payments Center
            </button>
          </div>
        </div>
      ) : (
        /* View 2: Confirmation & Employee Selection */
        <div className="space-y-4 text-xs">
          {/* Top Banner & Total Payable */}
          <div className="bg-gradient-to-r from-brand-950 to-brand-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md border border-brand-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>One-Tap Settlement Batch</span>
              </span>
              <div className="text-2xl font-black text-white mt-1">
                ₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-brand-200 mt-0.5">
                {selectedIds.length} of {pendingPayments.length} pending workers selected
              </p>
            </div>

            <div className="bg-brand-900/90 border border-brand-700 px-3.5 py-2 rounded-xl text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Gateway Environment</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center justify-end space-x-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Corporate Bank Rails</span>
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-brand-800" />
              <span className="font-bold text-slate-800">Disbursal Settlement Rail:</span>
            </div>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              disabled={processing}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-xs text-brand-950"
            >
              <option value="Bank Transfer">NEFT (National Electronic Fund Transfer)</option>
              <option value="IMPS">IMPS (Immediate Real-Time Transfer)</option>
              <option value="RTGS">RTGS (High-Value Gross Settlement)</option>
              <option value="UPI">UPI Direct Beneficiary</option>
              <option value="Direct Bank Payout Gateway">Corporate Banking API Rails</option>
            </select>
          </div>

          {/* Table Header Controls */}
          <div className="flex items-center justify-between text-xs px-1">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              disabled={processing}
              className="text-xs font-bold text-brand-900 hover:text-brand-800 flex items-center space-x-1.5 transition"
            >
              {selectedIds.length === pendingPayments.length && pendingPayments.length > 0 ? (
                <>
                  <CheckSquare className="w-4 h-4 text-brand-800" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Select All ({pendingPayments.length})</span>
                </>
              )}
            </button>
            <span className="text-slate-500 text-[11px]">
              Total Selected: <strong>{selectedIds.length} employees</strong>
            </span>
          </div>

          {/* Employee Selection Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto shadow-xs">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-brand-800 border-t-gold-500 rounded-full animate-spin mx-auto mb-2" />
                <span>Scanning eligible pending dues...</span>
              </div>
            ) : pendingPayments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span className="font-bold text-slate-700 block">No Pending Dues Found</span>
                <span className="text-[11px]">All salaries for this period have been fully settled!</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 font-bold text-slate-500 uppercase text-[10px] sticky top-0 bg-white">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center"></th>
                    <th className="py-2.5 px-3">Emp ID & Worker Name</th>
                    <th className="py-2.5 px-3">Bank Details</th>
                    <th className="py-2.5 px-3 text-right">Net Salary</th>
                    <th className="py-2.5 px-3 text-right">Already Paid</th>
                    <th className="py-2.5 px-3 text-right font-black text-amber-700">Pending Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingPayments.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    const rem = p.remaining_amount !== undefined ? p.remaining_amount : p.amount;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleToggleOne(p.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-gold-50/30 hover:bg-gold-50/50' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleOne(p.id)}
                            disabled={processing}
                            className="rounded text-brand-800 focus:ring-brand-700 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-brand-900 block">{p.emp_code}</span>
                          <span className="font-bold text-slate-800">{p.employee_name}</span>
                          <span className="text-[10px] text-slate-400 block">{p.department}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          <span className="text-slate-800 font-semibold block">{p.bank_name || 'SBI'}</span>
                          <span className="font-mono text-slate-500">
                            A/C: ••••{p.bank_account_no ? p.bank_account_no.slice(-4) : 'N/A'} • {p.bank_ifsc}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                          ₹{p.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                          ₹{(p.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-800 text-sm">
                          ₹{rem.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Authorization Checkbox & Safety Checklist */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedRisk}
                onChange={(e) => setConfirmedRisk(e.target.checked)}
                disabled={processing}
                className="mt-0.5 rounded text-brand-800 focus:ring-brand-800 w-4 h-4 cursor-pointer flex-shrink-0"
              />
              <span className="text-[11px] text-amber-950 leading-relaxed font-semibold">
                I verify that sufficient funds exist in the debit clearing account, and I authorize
                immediate direct payment disbursal for the {selectedIds.length} selected employee(s).
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteBulk}
              disabled={processing || selectedIds.length === 0 || !confirmedRisk}
              className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl shadow-md flex items-center space-x-2 transition disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Independent Payments...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Pay All Selected Dues (₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
