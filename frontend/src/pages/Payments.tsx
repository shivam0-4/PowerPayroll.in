import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  SalaryPayment,
  PayrollPeriod,
  PaymentTransaction,
  PaymentReceiptData,
  PendingPaymentSummary,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { OneTapPayModal } from '../components/payments/OneTapPayModal';
import { SinglePayModal } from '../components/payments/SinglePayModal';
import { PaymentReceiptModal } from '../components/payments/PaymentReceiptModal';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  Download,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Zap,
  History,
  FileText,
  Search,
  Building,
  ShieldCheck,
  Calendar,
  DollarSign,
  Printer,
  ChevronRight,
} from 'lucide-react';

export const Payments: React.FC = () => {
  // Navigation Tabs: 'register' | 'history' | 'reconciliation'
  const [activeTab, setActiveTab] = useState<'register' | 'history' | 'reconciliation'>('register');

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Selected checkbox IDs for batch reconciliation
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);

  // Modals state
  const [isOneTapModalOpen, setIsOneTapModalOpen] = useState(false);
  const [selectedSinglePayment, setSelectedSinglePayment] = useState<SalaryPayment | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSingleUpdateModalOpen, setIsSingleUpdateModalOpen] = useState(false);
  const [isBatchReconcileModalOpen, setIsBatchReconcileModalOpen] = useState(false);
  const [activePaymentForUpdate, setActivePaymentForUpdate] = useState<SalaryPayment | null>(null);

  // Form State for Manual Reconcile
  const [updateStatus, setUpdateStatus] = useState<string>('PAID');
  const [updateMode, setUpdateMode] = useState<string>('Bank Transfer');
  const [updateTxnRef, setUpdateTxnRef] = useState<string>('');
  const [updateDate, setUpdateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [batchPrefix, setBatchPrefix] = useState<string>('NEFT-SBI');
  const [bankStmtRef, setBankStmtRef] = useState<string>('STMT-NOV26-001');

  // History State
  const [historyList, setHistoryList] = useState<PaymentTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyModeFilter, setHistoryModeFilter] = useState<string>('');

  // Reconciliation Analytics State
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [reconLoading, setReconLoading] = useState(false);

  const { isRole } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (activeTab === 'register') {
      loadPayments();
    } else if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'reconciliation') {
      loadReconciliation();
    }
  }, [activeTab, selectedPeriodId, statusFilter, modeFilter, historyStatusFilter, historyModeFilter]);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const res = await api.getPayrollPeriods();
      setPeriods(res.periods);
      if (res.periods.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(res.periods[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load periods', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedPeriodId) params.period_id = selectedPeriodId;
      if (statusFilter) params.status = statusFilter;
      if (modeFilter) params.payment_mode = modeFilter;

      const [pRes, sRes] = await Promise.all([
        api.getPayments(params),
        api.getPaymentSummary(),
      ]);

      setPayments(pRes.payments);
      setSummary(sRes.summary);
      setSelectedPaymentIds([]);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const params: any = {};
      if (selectedPeriodId) params.period_id = selectedPeriodId;
      if (historyStatusFilter) params.status = historyStatusFilter;
      if (historyModeFilter) params.payment_mode = historyModeFilter;
      if (historySearch) params.search = historySearch;

      const res = await api.getPaymentHistory(params);
      setHistoryList(res.history || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load transaction history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadReconciliation = async () => {
    try {
      setReconLoading(true);
      const res = await api.getPaymentReconciliation(selectedPeriodId || undefined);
      setReconciliationData(res.reconciliation);
    } catch (err: any) {
      showToast(err.message || 'Failed to load reconciliation', 'error');
    } finally {
      setReconLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedPaymentIds.length === payments.length) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(payments.map((p) => p.id));
    }
  };

  const handleResetPaymentFilters = () => {
    setSearchFilter('');
    setStatusFilter('');
    setModeFilter('');
  };

  const toggleSelectOne = (id: number) => {
    if (selectedPaymentIds.includes(id)) {
      setSelectedPaymentIds(selectedPaymentIds.filter((pId) => pId !== id));
    } else {
      setSelectedPaymentIds([...selectedPaymentIds, id]);
    }
  };

  const openSingleUpdate = (p: SalaryPayment) => {
    setActivePaymentForUpdate(p);
    setUpdateStatus(p.status === 'PAID' ? 'PAID' : 'PAID');
    setUpdateMode(p.payment_mode || 'Bank Transfer');
    setUpdateTxnRef(p.transaction_ref || `TXN-${Math.floor(100000 + Math.random() * 900000)}`);
    setUpdateDate(new Date().toISOString().split('T')[0]);
    setIsSingleUpdateModalOpen(true);
  };

  const handleSingleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentForUpdate) return;
    try {
      await api.updatePayment(activePaymentForUpdate.id, {
        status: updateStatus,
        payment_mode: updateMode,
        transaction_ref: updateTxnRef,
        payment_date: updateDate,
      });
      showToast('Payment record updated and reconciled', 'success');
      setIsSingleUpdateModalOpen(false);
      loadPayments();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  const handleBatchReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPaymentIds.length === 0) return;
    try {
      const res = await api.reconcilePaymentsBatch({
        payment_ids: selectedPaymentIds,
        transaction_prefix: batchPrefix,
        payment_mode: updateMode,
        bank_statement_ref: bankStmtRef,
      });
      showToast(res.message, 'success');
      setIsBatchReconcileModalOpen(false);
      loadPayments();
    } catch (err: any) {
      showToast(err.message || 'Reconciliation failed', 'error');
    }
  };

  const handleViewReceiptByTxId = async (txId: number) => {
    try {
      const res = await api.getPaymentReceipt(txId);
      setActiveReceipt(res.receipt);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch receipt', 'error');
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchFilter) return true;
    const s = searchFilter.toLowerCase();
    return (
      p.employee_name?.toLowerCase().includes(s) ||
      p.emp_code?.toLowerCase().includes(s) ||
      p.transaction_ref?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Salary Payments & Settlement Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            One-tap salary settlement, corporate bank rails integration, and verifiable transaction history
          </p>
        </div>

        {/* Global Action Header */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedPeriodId && (
            <a
              href={`/api/payments/export/bank-statement/${selectedPeriodId}`}
              download
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export NEFT CSV</span>
            </a>
          )}

          {isRole('Super Admin', 'Accountant', 'HR Manager') && (
            <button
              onClick={() => setIsOneTapModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-brand-900 to-brand-800 hover:from-brand-950 hover:to-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Zap className="w-4 h-4 text-gold-400" />
              <span>Pay All Pending Dues</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 text-xs font-bold space-x-1">
        <button
          onClick={() => setActiveTab('register')}
          className={`flex flex-shrink-0 items-center space-x-2 whitespace-nowrap px-4 py-2.5 border-b-2 transition ${
            activeTab === 'register'
              ? 'border-brand-800 text-brand-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Salary Register & Pending Dues</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-shrink-0 items-center space-x-2 whitespace-nowrap px-4 py-2.5 border-b-2 transition ${
            activeTab === 'history'
              ? 'border-brand-800 text-brand-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Payment History & Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex flex-shrink-0 items-center space-x-2 whitespace-nowrap px-4 py-2.5 border-b-2 transition ${
            activeTab === 'reconciliation'
              ? 'border-brand-800 text-brand-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Bank Reconciliation & Clearing</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SALARY REGISTER & PENDING DUES */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'register' && (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Disbursable</span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">
                  ₹{(summary.total_pending_amount + summary.total_paid_this_month).toLocaleString('en-IN', {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="text-[10px] text-slate-400 block">{summary.total_records} payroll records</span>
              </div>

              <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 shadow-xs">
                <span className="text-[10px] text-amber-700 uppercase font-bold block">Total Pending Dues</span>
                <span className="text-lg font-black text-amber-900 block mt-0.5">
                  ₹{summary.total_pending_amount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold block">{summary.pending_employees_count} workers pending</span>
              </div>

              <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-xs">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Settled This Month</span>
                <span className="text-lg font-black text-emerald-800 block mt-0.5">
                  ₹{summary.total_paid_this_month?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block">Confirmed by Gateway</span>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-xs">
                <span className="text-[10px] text-emerald-600 uppercase font-bold block">Fully Paid</span>
                <span className="text-lg font-black text-emerald-900 block mt-0.5">
                  {summary.fully_paid_count}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium block">Complete settlement</span>
              </div>

              <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-100 shadow-xs">
                <span className="text-[10px] text-sky-700 uppercase font-bold block">Partially Paid</span>
                <span className="text-lg font-black text-sky-900 block mt-0.5">
                  {summary.partially_paid_count}
                </span>
                <span className="text-[10px] text-sky-600 font-medium block">Partial balance active</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Cycle</span>
                <select
                  value={selectedPeriodId || ''}
                  onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
                  className="w-full mt-1 p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-brand-900"
                >
                  <option value="">All Periods</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.period_label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search worker name or code..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">All Payment Statuses</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                <option value="PAYMENT_PROCESSING">PAYMENT_PROCESSING</option>
                <option value="PAID">PAID</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">All Payment Modes</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="IMPS">IMPS</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Direct Cash</option>
              </select>

              <button
                type="button"
                onClick={handleResetPaymentFilters}
                disabled={!searchFilter && !statusFilter && !modeFilter}
                className="flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              {isRole('Super Admin', 'Accountant') && (
                <button
                  onClick={() => setIsBatchReconcileModalOpen(true)}
                  disabled={selectedPaymentIds.length === 0}
                  className="px-3.5 py-1.5 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-xs flex items-center space-x-1.5 transition disabled:opacity-40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Batch Reconcile ({selectedPaymentIds.length})</span>
                </button>
              )}

              <button
                onClick={handleSelectAll}
                className="font-bold text-brand-800 hover:text-brand-900 flex items-center space-x-1"
              >
                {selectedPaymentIds.length === payments.length && payments.length > 0 ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-brand-800" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>Select All</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-3 w-8 text-center">#</th>
                    <th className="py-3 px-3">Worker Code & Name</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Bank Details</th>
                    <th className="py-3 px-3 text-right">Net Payable</th>
                    <th className="py-3 px-3 text-right">Settled Amount</th>
                    <th className="py-3 px-3 text-right font-black text-amber-800">Remaining Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        <div className="w-6 h-6 border-2 border-brand-800 border-t-gold-500 rounded-full animate-spin mx-auto mb-2" />
                        <span>Loading payment records...</span>
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        {payments.length === 0 ? (
                          <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4">
                            <CreditCard className="h-8 w-8 text-slate-300" />
                            <span className="font-bold text-slate-700">No salary payment records yet</span>
                            <span>
                              Payment records are created after payroll is calculated. Check attendance and wages,
                              then calculate a payroll period to populate this register.
                            </span>
                            <Link
                              to="/payroll"
                              className="mt-1 rounded-lg bg-brand-800 px-3 py-2 font-bold text-gold-400 hover:bg-brand-900"
                            >
                              Open Payroll
                            </Link>
                          </div>
                        ) : (
                          <div className="mx-auto max-w-md px-4">
                            No payment records match these filters. Clear the filters or choose another payroll period.
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const isSelected = selectedPaymentIds.includes(p.id);
                      const rem = p.remaining_amount !== undefined ? p.remaining_amount : p.amount;
                      const hasPendingDues = rem > 0.001 && p.status !== 'PAID';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(p.id)}
                              className="rounded text-brand-800 w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-brand-900 block">{p.emp_code}</span>
                            <span className="font-bold text-slate-900">{p.employee_name}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{p.department}</td>
                          <td className="py-3 px-3 font-mono text-[11px]">
                            <span className="font-semibold text-slate-800 block">{p.bank_name || 'SBI'}</span>
                            <span className="text-slate-400">••••{p.bank_account_no ? p.bank_account_no.slice(-4) : 'N/A'}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            ₹{p.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                            ₹{(p.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-800">
                            ₹{rem.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge status={p.status} />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {hasPendingDues ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedSinglePayment(p)}
                                  className="px-3 py-1 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-lg text-xs shadow-xs transition cursor-pointer"
                                >
                                  Pay Now
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openSingleUpdate(p)}
                                  className="px-2.5 py-1 text-slate-500 hover:text-brand-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                                >
                                  Audit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: PAYMENT HISTORY & AUDIT TRAIL (Requirement 6) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4 text-xs">
          {/* History Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search employee or UTR..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadHistory()}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-60"
                />
              </div>

              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Settlement Statuses</option>
                <option value="PAID">PAID</option>
                <option value="PAYMENT_PROCESSING">PAYMENT_PROCESSING</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>

              <select
                value={historyModeFilter}
                onChange={(e) => setHistoryModeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Payout Rails</option>
                <option value="Bank Transfer">Bank Transfer (NEFT)</option>
                <option value="IMPS">IMPS</option>
                <option value="RTGS">RTGS</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <button
              onClick={() => loadHistory()}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center space-x-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {/* History Table (11 Required Fields) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase text-[10px]">
                    <th className="py-3 px-3">Worker ID & Name</th>
                    <th className="py-3 px-3">Salary Month</th>
                    <th className="py-3 px-3 text-right">Gross Salary</th>
                    <th className="py-3 px-3 text-right">Deductions</th>
                    <th className="py-3 px-3 text-right">Net Payable</th>
                    <th className="py-3 px-3 text-right font-black text-emerald-800">Amount Paid</th>
                    <th className="py-3 px-3 text-right font-black text-amber-700">Remaining</th>
                    <th className="py-3 px-3">Settlement Date</th>
                    <th className="py-3 px-3">Transaction ID / UTR</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={12} className="text-center py-12 text-slate-400">
                        <div className="w-6 h-6 border-2 border-brand-800 border-t-gold-500 rounded-full animate-spin mx-auto mb-2" />
                        <span>Loading audit ledger...</span>
                      </td>
                    </tr>
                  ) : historyList.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-12 text-slate-400">
                        <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span className="font-bold text-slate-600 block">No payment transactions yet</span>
                        <span>
                          Transactions appear after a salary payment is initiated. If the salary register is empty,
                          calculate a payroll period first.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    historyList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-brand-900 block">{tx.emp_code}</span>
                          <span className="font-bold text-slate-900">{tx.employee_name}</span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {tx.period_label || tx.salary_month || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          ₹{tx.gross_salary?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600">
                          ₹{tx.total_deductions?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          ₹{tx.net_payable?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                          ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                          ₹{tx.remaining_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                          {tx.confirmed_at
                            ? new Date(tx.confirmed_at).toLocaleDateString('en-IN')
                            : tx.initiated_at
                            ? new Date(tx.initiated_at).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-800 break-all">
                          {tx.transaction_ref}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{tx.payment_mode}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge status={tx.status} />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {tx.status === 'PAID' && (
                            <button
                              type="button"
                              onClick={() => handleViewReceiptByTxId(tx.id)}
                              className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-900 font-bold rounded-lg text-[11px] transition inline-flex items-center space-x-1"
                              title="Download / Print Payment Receipt"
                            >
                              <FileText className="w-3.5 h-3.5 text-brand-800" />
                              <span>Receipt</span>
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: BANK RECONCILIATION & CLEARING */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6 text-xs">
          {reconciliationData && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Net Salary Payable</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  ₹{reconciliationData.total_salary_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">{reconciliationData.total_payments_count} salary records</span>
              </div>

              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-xs">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Total Bank Settled</span>
                <span className="text-xl font-black text-emerald-800 mt-1 block">
                  ₹{reconciliationData.total_settled_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">{reconciliationData.paid_transactions_count} cleared payouts</span>
              </div>

              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-xs">
                <span className="text-[10px] text-amber-700 font-bold uppercase block">Unsettled Dues</span>
                <span className="text-xl font-black text-amber-800 mt-1 block">
                  ₹{reconciliationData.total_pending_dues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-amber-700 mt-0.5 block">Pending corporate disbursal</span>
              </div>

              <div className="bg-brand-950 text-white p-5 rounded-2xl border border-brand-800 shadow-xs">
                <span className="text-[10px] text-gold-400 font-bold uppercase block">Clearing Rate</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {reconciliationData.settlement_rate_percent}%
                </span>
                <span className="text-[11px] text-brand-200 mt-0.5 block">Reconciliation accuracy</span>
              </div>
            </div>
          )}

          {/* Bank File Upload & Reconcile Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Automated Clearing House & Bank Statement Matching</h3>
            <p className="text-slate-500 text-xs">
              Upload bank statement files (SBI Corporate, HDFC CMS, ICICI Corporate Net Banking) to verify
              UTR numbers and finalize monthly salary books.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchReconcileModalOpen(true)}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl shadow-xs transition"
              >
                Trigger Manual Batch Reconcile
              </button>

              {selectedPeriodId && (
                <a
                  href={`/api/payments/export/bank-statement/${selectedPeriodId}`}
                  download
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Bank Transfer NEFT File</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* One-Tap Bulk Payment Modal */}
      <OneTapPayModal
        isOpen={isOneTapModalOpen}
        onClose={() => setIsOneTapModalOpen(false)}
        periodId={selectedPeriodId}
        onSuccess={() => {
          loadPayments();
          if (activeTab === 'history') loadHistory();
        }}
        onViewReceipt={(receipt) => {
          setActiveReceipt(receipt);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Single Employee Pay Now Modal */}
      <SinglePayModal
        isOpen={!!selectedSinglePayment}
        onClose={() => setSelectedSinglePayment(null)}
        payment={selectedSinglePayment}
        onSuccess={() => {
          loadPayments();
          if (activeTab === 'history') loadHistory();
        }}
        onViewReceipt={(receipt) => {
          setActiveReceipt(receipt);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Printable Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={activeReceipt}
      />

      {/* Legacy Single Update Modal */}
      <Modal
        isOpen={isSingleUpdateModalOpen}
        onClose={() => setIsSingleUpdateModalOpen(false)}
        title="Audit Payment Record"
        subtitle={`Employee: ${activePaymentForUpdate?.employee_name}`}
      >
        <form onSubmit={handleSingleUpdate} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Status</label>
            <select
              value={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            >
              <option value="PAID">PAID</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="PAYMENT_PROCESSING">PAYMENT_PROCESSING</option>
              <option value="FAILED">FAILED</option>
              <option value="UNPAID">UNPAID</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Disbursal Mode</label>
            <select
              value={updateMode}
              onChange={(e) => setUpdateMode(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            >
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="Cash">Cash Handover</option>
              <option value="UPI">UPI Direct</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Transaction Reference</label>
            <input
              type="text"
              value={updateTxnRef}
              onChange={(e) => setUpdateTxnRef(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSingleUpdateModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Save Reconciled State
            </button>
          </div>
        </form>
      </Modal>

      {/* Legacy Batch Reconcile Modal */}
      <Modal
        isOpen={isBatchReconcileModalOpen}
        onClose={() => setIsBatchReconcileModalOpen(false)}
        title="Batch Reconcile Against Statement"
        subtitle={`Reconciling ${selectedPaymentIds.length} payments`}
      >
        <form onSubmit={handleBatchReconcile} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Bank Statement Reference</label>
            <input
              type="text"
              value={bankStmtRef}
              onChange={(e) => setBankStmtRef(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl font-mono"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Transaction Ref Prefix</label>
            <input
              type="text"
              value={batchPrefix}
              onChange={(e) => setBatchPrefix(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBatchReconcileModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Confirm Reconcile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
