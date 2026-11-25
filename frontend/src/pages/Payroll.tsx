import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { PayrollPeriod, PayrollRecord, Department, SalaryPayment, PaymentReceiptData } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { OneTapPayModal } from '../components/payments/OneTapPayModal';
import { SinglePayModal } from '../components/payments/SinglePayModal';
import { PaymentReceiptModal } from '../components/payments/PaymentReceiptModal';
import {
  Calculator,
  Play,
  CheckCircle2,
  Lock,
  Eye,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingDown,
  Layers,
  Calendar,
  AlertTriangle,
  Zap,
  CreditCard,
} from 'lucide-react';

export const Payroll: React.FC = () => {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedWageType, setSelectedWageType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // New Period Modal
  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newWorkingDays, setNewWorkingDays] = useState(26);

  // Snapshot Inspection Modal
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<any>(null);

  // Payment Settlement Modals
  const [isOneTapModalOpen, setIsOneTapModalOpen] = useState(false);
  const [selectedSinglePayment, setSelectedSinglePayment] = useState<SalaryPayment | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const { isRole } = useAuth();
  const { showToast } = useToast();

  const handlePayRecord = (r: PayrollRecord) => {
    setSelectedSinglePayment({
      id: (r as any).payment_id,
      payroll_record_id: r.id,
      employee_id: r.employee_id,
      employee_name: r.employee_name,
      emp_code: r.emp_code,
      department: r.department_name,
      amount: r.net_salary,
      paid_amount: (r as any).paid_amount || 0,
      remaining_amount: (r as any).remaining_amount !== undefined ? (r as any).remaining_amount : r.net_salary,
      status: (r as any).payment_status || 'UNPAID',
      payment_mode: 'Bank Transfer'
    });
  };

  useEffect(() => {
    loadPeriods();
    loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadPeriodDetails(selectedPeriodId);
    }
  }, [selectedPeriodId, selectedDept, selectedWageType]);

  const loadDepartments = async () => {
    try {
      const res = await api.getDepartments();
      setDepartments(res.departments);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const res = await api.getPayrollPeriods();
      setPeriods(res.periods);
      if (res.periods.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(res.periods[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load payroll periods', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodDetails = async (periodId: number) => {
    try {
      setLoading(true);
      const res = await api.getPayrollPeriodDetails(
        periodId,
        selectedDept ? Number(selectedDept) : undefined,
        selectedWageType || undefined
      );
      setCurrentPeriod(res.period);
      setRecords(res.records);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payroll records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.generatePayrollPeriod({
        month: Number(newMonth),
        year: Number(newYear),
        working_days: Number(newWorkingDays),
      });
      showToast(res.message, 'success');
      setIsNewPeriodModalOpen(false);
      await loadPeriods();
      setSelectedPeriodId(res.period.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate period', 'error');
    }
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriodId) return;
    try {
      setCalculating(true);
      const res = await api.calculatePayroll(selectedPeriodId);
      showToast(res.message, 'success');
      loadPeriodDetails(selectedPeriodId);
      loadPeriods();
    } catch (err: any) {
      showToast(err.message || 'Payroll calculation failed', 'error');
    } finally {
      setCalculating(false);
    }
  };

  const handleApprovePayroll = async () => {
    if (!selectedPeriodId) return;
    if (!confirm('Approve this payroll calculation? Accountant confirmation recorded.')) return;
    try {
      const res = await api.approvePayroll(selectedPeriodId);
      showToast(res.message, 'success');
      loadPeriodDetails(selectedPeriodId);
      loadPeriods();
    } catch (err: any) {
      showToast(err.message || 'Payroll approval failed', 'error');
    }
  };

  const handleLockPayroll = async () => {
    if (!selectedPeriodId) return;
    if (!confirm('LOCK and finalize payroll? This generates payslips and freezes records permanently.')) return;
    try {
      const res = await api.lockPayroll(selectedPeriodId);
      showToast(res.message, 'success');
      loadPeriodDetails(selectedPeriodId);
      loadPeriods();
    } catch (err: any) {
      showToast(err.message || 'Locking failed', 'error');
    }
  };

  const openSnapshotModal = async (recordId: number) => {
    try {
      const res = await api.getPayrollRecordDetails(recordId);
      setInspectedRecord(res.record);
      setIsSnapshotModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to load details', 'error');
    }
  };

  const getWorkflowSteps = () => {
    const status = currentPeriod?.status || 'Draft';
    return [
      { name: '1. Period Setup', active: true, done: true },
      { name: '2. Calculation', active: true, done: ['Calculated', 'Approved', 'Locked'].includes(status) },
      { name: '3. Approval', active: ['Approved', 'Locked'].includes(status), done: ['Approved', 'Locked'].includes(status) },
      { name: '4. Locked & Disbursed', active: status === 'Locked', done: status === 'Locked' },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payroll Calculation & Approval Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            15-step automated gross earnings, statutory deductions (PF, ESIC, PT, TDS), advance adjustments, and payslip locking
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isRole('Super Admin', 'Accountant', 'Payroll Manager') && (
            <button
              onClick={() => setIsNewPeriodModalOpen(true)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs shadow-xs transition"
            >
              + Create Payroll Month
            </button>
          )}

          {currentPeriod && isRole('Super Admin', 'Accountant', 'Payroll Manager') && (
            <button
              onClick={handleCalculatePayroll}
              disabled={calculating || ['Approved', 'Locked'].includes(currentPeriod.status)}
              className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              <span>{calculating ? 'Processing...' : 'Run Calculation'}</span>
            </button>
          )}

          {currentPeriod && currentPeriod.status === 'Calculated' && isRole('Super Admin', 'Accountant') && (
            <button
              onClick={handleApprovePayroll}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Payroll</span>
            </button>
          )}

          {currentPeriod && currentPeriod.status === 'Approved' && isRole('Super Admin') && (
            <button
              onClick={handleLockPayroll}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
            >
              <Lock className="w-4 h-4" />
              <span>Lock & Finalize</span>
            </button>
          )}

          {currentPeriod && currentPeriod.status === 'Locked' && isRole('Super Admin', 'Accountant', 'HR Manager') && (
            <button
              onClick={() => setIsOneTapModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-brand-900 to-brand-800 hover:from-brand-950 hover:to-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Zap className="w-4 h-4 text-gold-400" />
              <span>One-Tap Pay Dues</span>
            </button>
          )}
        </div>
      </div>

      {/* Period Selector & Workflow Tracker */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payroll Cycle:</span>
            <select
              value={selectedPeriodId || ''}
              onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
              className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-700"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.period_label} ({p.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium">Working Days Base:</span>
            <span className="font-bold text-slate-800 text-xs">{currentPeriod?.total_working_days || 26} days</span>
            <Badge status={currentPeriod?.status || 'Draft'} />
          </div>
        </div>

        {/* 4-Step Pipeline Bar */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
          {getWorkflowSteps().map((step, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-center font-bold transition ${
                step.done
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : step.active
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {step.name}
            </div>
          ))}
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      {currentPeriod && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Earnings</span>
            <span className="text-xl font-black text-slate-900">
              ₹{currentPeriod.total_gross?.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs">
            <span className="text-[10px] text-rose-500 uppercase font-bold block">Total Deductions</span>
            <span className="text-xl font-black text-rose-700">
              ₹{currentPeriod.total_deductions?.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
            <span className="text-[10px] text-emerald-600 uppercase font-bold block">Net Salary Payable</span>
            <span className="text-xl font-black text-emerald-700">
              ₹{currentPeriod.total_net?.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Workers Processed</span>
            <span className="text-xl font-black text-slate-800">{currentPeriod.employee_count}</span>
          </div>
        </div>
      )}

      {/* Filter and Payroll Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>

            <select
              value={selectedWageType}
              onChange={(e) => setSelectedWageType(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="">All Wage Types</option>
              <option value="daily_wage">Daily Wage</option>
              <option value="monthly_salary">Monthly Salary</option>
            </select>
          </div>

          <div className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-800">{records.length}</span> payroll line items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Worker</th>
                <th className="py-3 px-4">Wage Structure</th>
                <th className="py-3 px-4 text-center">Payable Days</th>
                <th className="py-3 px-4 text-center">Overtime</th>
                <th className="py-3 px-4 text-right">Gross Earnings</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right font-bold text-emerald-800">Net Salary</th>
                <th className="py-3 px-4 text-center">Audit</th>
                <th className="py-3 px-4 text-center">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    Loading payroll records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No calculated payroll records for this period. Click 'Run Calculation' above.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.employee_name}</div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {r.emp_code} • {r.department_name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">
                        {r.wage_type === 'daily_wage' ? `₹${r.base_rate}/day` : `₹${r.base_rate}/mo`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {r.payable_days} <span className="text-[10px] text-slate-400">days</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.overtime_hours > 0 ? (
                        <div>
                          <span className="font-bold text-gold-700">{r.overtime_hours}h</span>
                          <div className="text-[10px] text-slate-400">₹{r.overtime_amount}</div>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{r.gross_earnings.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      ₹{r.total_deductions.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800 text-sm">
                      ₹{r.net_salary.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openSnapshotModal(r.id)}
                        className="p-1.5 text-slate-400 hover:text-brand-800 hover:bg-slate-100 rounded-lg transition"
                        title="Audit Breakdown"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {currentPeriod?.status === 'Locked' &&
                        (r as any).payment_status !== 'PAID' &&
                        isRole('Super Admin', 'Accountant', 'HR Manager') ? (
                        <button
                          onClick={() => handlePayRecord(r)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[10px] flex items-center space-x-1 transition mx-auto"
                          title="Pay Now"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Pay Now</span>
                        </button>
                      ) : (r as any).payment_status === 'PAID' ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ Paid
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Period Modal */}
      <Modal
        isOpen={isNewPeriodModalOpen}
        onClose={() => setIsNewPeriodModalOpen(false)}
        title="Initialize New Payroll Month"
        subtitle="Set up standard working days and start cycle calculation"
      >
        <form onSubmit={handleGeneratePeriod} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Month</label>
              <select
                value={newMonth}
                onChange={(e) => setNewMonth(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-xl"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Year</label>
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Company Working Days</label>
            <input
              type="number"
              value={newWorkingDays}
              onChange={(e) => setNewWorkingDays(Number(e.target.value))}
              className="w-full p-2 border border-slate-200 rounded-xl font-bold"
            />
            <span className="text-[10px] text-slate-400">Typically 26 days (excluding Sundays)</span>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewPeriodModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Initialize Period
            </button>
          </div>
        </form>
      </Modal>

      {/* Calculation Snapshot Modal */}
      <Modal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        title={`Audit Breakdown: ${inspectedRecord?.employee_name}`}
        subtitle={`Emp ID: ${inspectedRecord?.emp_code}`}
        maxWidth="lg"
      >
        {inspectedRecord && (
          <div className="space-y-4 text-xs">
            {inspectedRecord.review_flag && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Review Note:</div>
                  <div>{inspectedRecord.review_notes}</div>
                </div>
              </div>
            )}

            {/* Earnings Breakdown */}
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="font-bold text-slate-900 border-b pb-1.5 mb-2">Earnings Components</div>
              <div className="space-y-1">
                {inspectedRecord.earnings?.map((e: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-slate-600">{e.component_name}</span>
                    <span className="font-bold text-slate-900">₹{e.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-1.5 flex justify-between font-black text-slate-900">
                  <span>Gross Earnings</span>
                  <span>₹{inspectedRecord.gross_earnings.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="font-bold text-slate-900 border-b pb-1.5 mb-2">Deduction Components</div>
              <div className="space-y-1">
                {inspectedRecord.deductions?.map((d: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-slate-600">{d.deduction_name}</span>
                    <span className="font-bold text-rose-600">₹{d.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-1.5 flex justify-between font-black text-rose-700">
                  <span>Total Deductions</span>
                  <span>₹{inspectedRecord.total_deductions.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Net */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex justify-between items-center text-emerald-950 font-black text-sm">
              <span>Net Payable Salary</span>
              <span className="text-base text-emerald-800">₹{inspectedRecord.net_salary.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Settlement Modals */}
      {currentPeriod && (
        <OneTapPayModal
          isOpen={isOneTapModalOpen}
          periodId={currentPeriod.id}
          onClose={() => setIsOneTapModalOpen(false)}
          onSuccess={() => {
            setIsOneTapModalOpen(false);
            if (selectedPeriodId) loadPeriodDetails(selectedPeriodId);
          }}
          onViewReceipt={(receipt) => {
            setActiveReceipt(receipt);
            setIsReceiptModalOpen(true);
          }}
        />
      )}

      <SinglePayModal
        isOpen={selectedSinglePayment !== null}
        payment={selectedSinglePayment}
        onClose={() => setSelectedSinglePayment(null)}
        onSuccess={() => {
          setSelectedSinglePayment(null);
          if (selectedPeriodId) loadPeriodDetails(selectedPeriodId);
        }}
        onViewReceipt={(receipt) => {
          setSelectedSinglePayment(null);
          setActiveReceipt(receipt);
          setIsReceiptModalOpen(true);
        }}
      />

      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        receipt={activeReceipt}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setActiveReceipt(null);
        }}
      />
    </div>
  );
};
