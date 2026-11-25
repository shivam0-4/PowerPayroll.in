import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Advance, Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { HandCoins, Plus, DollarSign, History, CheckCircle2 } from 'lucide-react';

export const Advances: React.FC = () => {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeAdvance, setActiveAdvance] = useState<Advance | null>(null);
  const [repaymentsHistory, setRepaymentsHistory] = useState<any[]>([]);

  // Form State
  const [issueEmpId, setIssueEmpId] = useState<string>('');
  const [issueAmount, setIssueAmount] = useState<number>(5000);
  const [issueInstallment, setIssueInstallment] = useState<number>(1500);
  const [issueReason, setIssueReason] = useState<string>('Festival / Medical');
  const [issueMode, setIssueMode] = useState<string>('Cash');

  // Repay State
  const [repayAmount, setRepayAmount] = useState<number>(1000);
  const [repayMode, setRepayMode] = useState<string>('Cash');
  const [repayNotes, setRepayNotes] = useState<string>('Direct cash payment at factory counter');

  const { isRole } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadAdvances();
    loadEmployees();
  }, []);

  const loadAdvances = async () => {
    try {
      setLoading(true);
      const res = await api.getAdvances();
      setAdvances(res.advances);
      setTotalOutstanding(res.total_outstanding);
    } catch (err: any) {
      showToast(err.message || 'Failed to load advances', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.getEmployees();
      setEmployees(res.employees);
      if (res.employees.length > 0) {
        setIssueEmpId(String(res.employees[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssueAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.issueAdvance({
        employee_id: Number(issueEmpId),
        amount: Number(issueAmount),
        monthly_installment: Number(issueInstallment),
        reason: issueReason,
        payment_mode: issueMode,
      });
      showToast('Advance issued successfully', 'success');
      setIsIssueModalOpen(false);
      loadAdvances();
    } catch (err: any) {
      showToast(err.message || 'Failed to issue advance', 'error');
    }
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdvance) return;
    try {
      await api.repayAdvance(activeAdvance.id, {
        amount: Number(repayAmount),
        payment_mode: repayMode,
        notes: repayNotes,
      });
      showToast('Repayment recorded successfully', 'success');
      setIsRepayModalOpen(false);
      loadAdvances();
    } catch (err: any) {
      showToast(err.message || 'Repayment failed', 'error');
    }
  };

  const openHistory = async (adv: Advance) => {
    setActiveAdvance(adv);
    try {
      const res = await api.getAdvanceHistory(adv.id);
      setRepaymentsHistory(res.repayments);
      setIsHistoryModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to load history', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Advance & Worker Loan Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue emergency advances, manage monthly installment deductions, and track outstanding settlements
          </p>
        </div>

        {isRole('Super Admin', 'Accountant', 'HR Manager', 'Payroll Manager') && (
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Salary Advance</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Outstanding Balance</span>
          <span className="text-2xl font-black text-amber-700">₹{totalOutstanding.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Across active worker loans</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Advances</span>
          <span className="text-2xl font-black text-slate-900">
            {advances.filter((a) => a.status === 'Approved' && a.remaining_amount > 0).length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Eligible for payroll recovery</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
          <span className="text-[10px] text-emerald-600 uppercase font-bold block">Fully Settled</span>
          <span className="text-2xl font-black text-emerald-700">
            {advances.filter((a) => a.status === 'Settled').length}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Zero balance remaining</span>
        </div>
      </div>

      {/* Advances Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Worker Code & Name</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Original Loan</th>
                <th className="py-3 px-4">Monthly EMI</th>
                <th className="py-3 px-4 text-rose-700">Outstanding Balance</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Loading advance ledger...
                  </td>
                </tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No advance records found.
                  </td>
                </tr>
              ) : (
                advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{adv.employee_name}</div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {adv.emp_code} • {adv.department_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{adv.request_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">₹{adv.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-bold text-slate-600">
                      ₹{adv.monthly_installment.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400">/ mo</span>
                    </td>
                    <td className="py-3 px-4 font-black text-rose-600 text-sm">
                      ₹{adv.remaining_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{adv.reason || 'General'}</td>
                    <td className="py-3 px-4">
                      <Badge status={adv.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openHistory(adv)}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        History
                      </button>

                      {adv.remaining_amount > 0 && isRole('Super Admin', 'Accountant') && (
                        <button
                          onClick={() => {
                            setActiveAdvance(adv);
                            setRepayAmount(Math.min(adv.monthly_installment, adv.remaining_amount));
                            setIsRepayModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        >
                          Direct Repay
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Advance Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Employee Salary Advance"
        subtitle="Approved advance will automatically deduct via configured monthly installments in payroll"
      >
        <form onSubmit={handleIssueAdvance} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Select Employee</label>
            <select
              value={issueEmpId}
              onChange={(e) => setIssueEmpId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.emp_code} - {e.full_name} ({e.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Advance Amount (₹)</label>
              <input
                type="number"
                required
                min="500"
                step="500"
                value={issueAmount}
                onChange={(e) => setIssueAmount(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Monthly Installment (₹)</label>
              <input
                type="number"
                required
                min="100"
                step="100"
                value={issueInstallment}
                onChange={(e) => setIssueInstallment(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
            <select
              value={issueMode}
              onChange={(e) => setIssueMode(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            >
              <option value="Cash">Cash Disbursal Envelope</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Reason / Notes</label>
            <input
              type="text"
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Authorize Advance
            </button>
          </div>
        </form>
      </Modal>

      {/* Direct Repayment Modal */}
      <Modal
        isOpen={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        title={`Direct Cash / Bank Repayment: ${activeAdvance?.employee_name}`}
        subtitle={`Outstanding: ₹${activeAdvance?.remaining_amount.toLocaleString('en-IN')}`}
      >
        <form onSubmit={handleRepay} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Repayment Amount (₹)</label>
            <input
              type="number"
              required
              max={activeAdvance?.remaining_amount || 0}
              value={repayAmount}
              onChange={(e) => setRepayAmount(Number(e.target.value))}
              className="w-full p-2 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
            <select
              value={repayMode}
              onChange={(e) => setRepayMode(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            >
              <option value="Cash">Direct Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Receipt / Voucher Notes</label>
            <input
              type="text"
              value={repayNotes}
              onChange={(e) => setRepayNotes(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsRepayModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:bg-emerald-800"
            >
              Record Repayment
            </button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Repayment Audit Trail: ${activeAdvance?.employee_name}`}
        subtitle={`Original Loan: ₹${activeAdvance?.amount} • Remaining: ₹${activeAdvance?.remaining_amount}`}
      >
        <div className="space-y-3 text-xs">
          {repaymentsHistory.length === 0 ? (
            <div className="text-center py-6 text-slate-400">No repayments recorded yet for this advance.</div>
          ) : (
            <div className="space-y-2">
              {repaymentsHistory.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-800">{rep.payment_mode}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {rep.deduction_date} • {rep.notes || 'Routine Installment'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">₹{rep.amount.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">Bal: ₹{rep.remaining_balance_after.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
