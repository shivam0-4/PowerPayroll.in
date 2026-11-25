import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardData, SalaryPayment, PaymentReceiptData, PendingPaymentSummary } from '../types';
import { Badge } from '../components/common/Badge';
import { OneTapPayModal } from '../components/payments/OneTapPayModal';
import { SinglePayModal } from '../components/payments/SinglePayModal';
import { PaymentReceiptModal } from '../components/payments/PaymentReceiptModal';
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  HandCoins,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  Layers,
  Zap,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<SalaryPayment[]>([]);

  // Payment Modals State
  const [isOneTapModalOpen, setIsOneTapModalOpen] = useState(false);
  const [selectedPayRecord, setSelectedPayRecord] = useState<SalaryPayment | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardAnalytics();
      setData(res);

      // Also fetch pending payments for the quick settlement table
      try {
        const pRes = await api.getPendingPayments();
        setPendingPayments(pRes.pending_payments || []);
      } catch (pErr) {
        console.error('Error fetching pending payments:', pErr);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceipt = (receipt: PaymentReceiptData) => {
    setActiveReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-800 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  const { kpis, monthly_trends, department_costs, category_distribution, attendance_trends, alerts } = data;
  const pendingSummary: PendingPaymentSummary = kpis.pending_summary || {
    total_pending_amount: kpis.pending_payments_total || 0,
    pending_employees_count: kpis.pending_payments_count || 0,
    fully_paid_count: 0,
    partially_paid_count: 0,
    overdue_count: 0,
    total_paid_this_month: 0,
    total_records: 0,
    gateway_info: {
      mode: 'SANDBOX',
      is_sandbox: true,
      provider_label: 'Commercial Bank Rails (Sandbox Test Mode)',
      single_payout_limit: 500000,
    },
  };

  const PIE_COLORS = ['#047857', '#d97706', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-brand-900 to-brand-800 rounded-2xl p-6 text-white shadow-lg border border-brand-700">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center space-x-2">
            <span>GROUPON POWER Executive Overview</span>
          </h1>
          <p className="text-xs text-brand-200 mt-1">
            Real-time workforce deployment, statutory compliance, and one-tap salary settlement
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className="bg-brand-950/60 px-3.5 py-2 rounded-xl border border-brand-700 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Payroll</span>
            <span className="font-extrabold text-gold-400">{kpis.latest_period_label}</span>
          </div>
          <div className="bg-brand-950/60 px-3.5 py-2 rounded-xl border border-brand-700 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Cycle Status</span>
            <span className="font-bold text-emerald-400">{kpis.latest_period_status}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Total Employees */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Workforce</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.total_employees}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {kpis.active_employees} Active on Roll
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Present Today</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.present_today}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Factory / Sites</div>
        </div>

        {/* Absent Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Absent Today</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{kpis.absent_today}</div>
          <div className="text-[11px] text-rose-500 font-medium mt-1">Requires Attendance Action</div>
        </div>

        {/* Monthly Net Salary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Payroll</span>
            <div className="w-8 h-8 rounded-lg bg-gold-50 text-gold-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{kpis.monthly_net.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Gross: ₹{kpis.monthly_gross.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Pending Advances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Outstanding Loans</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            ₹{kpis.pending_advances.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Scheduled EMI Deductions</div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PENDING PAYMENTS & ONE-TAP SETTLEMENT SECTION (Requirement 2) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-brand-900 text-gold-400 rounded-lg">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">Pending Salary Payments & Settlement</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live corporate bank rails settlement dashboard • Process pending dues with a single click
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Payout Rail</span>
              <span className="text-xs font-semibold text-emerald-700 flex items-center justify-end space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{pendingSummary.gateway_info?.provider_label || 'Sandbox Bank Rails'}</span>
              </span>
            </div>

            <button
              onClick={() => setIsOneTapModalOpen(true)}
              disabled={pendingSummary.pending_employees_count === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-900 to-brand-800 hover:from-brand-950 hover:to-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-2 transition disabled:opacity-40 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-gold-400" />
              <span>Pay All Pending Dues</span>
              <span className="bg-brand-950/80 text-white px-2 py-0.5 rounded-full text-[10px]">
                {pendingSummary.pending_employees_count}
              </span>
            </button>
          </div>
        </div>

        {/* 6 Key Metrics for Pending Payments (Requirement 2) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total pending amount */}
          <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-amber-700 uppercase font-bold block">Total Pending Dues</span>
            <span className="text-lg font-black text-amber-900 block mt-0.5">
              ₹{pendingSummary.total_pending_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-amber-700/80 font-medium mt-0.5 block">Awaiting settlement</span>
          </div>

          {/* 2. Number of employees with pending dues */}
          <div className="bg-orange-50/70 border border-orange-200/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-orange-700 uppercase font-bold block">Pending Workers</span>
            <span className="text-lg font-black text-orange-900 block mt-0.5">
              {pendingSummary.pending_employees_count}
            </span>
            <span className="text-[10px] text-orange-700/80 font-medium mt-0.5 block">Eligible for payout</span>
          </div>

          {/* 3. Fully paid employees */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-emerald-700 uppercase font-bold block">Fully Paid</span>
            <span className="text-lg font-black text-emerald-900 block mt-0.5">
              {pendingSummary.fully_paid_count}
            </span>
            <span className="text-[10px] text-emerald-700/80 font-medium mt-0.5 block">100% Settled</span>
          </div>

          {/* 4. Partially paid employees */}
          <div className="bg-sky-50/70 border border-sky-200/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-sky-700 uppercase font-bold block">Partially Paid</span>
            <span className="text-lg font-black text-sky-900 block mt-0.5">
              {pendingSummary.partially_paid_count}
            </span>
            <span className="text-[10px] text-sky-700/80 font-medium mt-0.5 block">Partial disbursal</span>
          </div>

          {/* 5. Overdue payments */}
          <div className={`p-3.5 rounded-xl border ${
            pendingSummary.overdue_count > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[10px] font-bold uppercase block ${
              pendingSummary.overdue_count > 0 ? 'text-rose-700' : 'text-slate-400'
            }`}>
              Overdue Payments
            </span>
            <span className={`text-lg font-black block mt-0.5 ${
              pendingSummary.overdue_count > 0 ? 'text-rose-900' : 'text-slate-700'
            }`}>
              {pendingSummary.overdue_count}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Prior cycles</span>
          </div>

          {/* 6. Total amount successfully paid this month */}
          <div className="bg-brand-50 border border-brand-200/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-brand-800 uppercase font-bold block">Paid This Month</span>
            <span className="text-lg font-black text-brand-950 block mt-0.5">
              ₹{pendingSummary.total_paid_this_month.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-brand-800/80 font-medium mt-0.5 block">Confirmed clearing</span>
          </div>
        </div>

        {/* Pending Employees Quick Settlement Table */}
        {pendingPayments.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Workers Awaiting Settlement ({pendingPayments.length})</span>
              <span className="text-[11px] text-slate-400">Click Pay Now for individual settlement or Pay All above</span>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-white border-b border-slate-200 font-bold text-slate-500 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Emp Code</th>
                    <th className="py-2 px-3">Employee Name</th>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3">Bank Details</th>
                    <th className="py-2 px-3 text-right">Net Payable</th>
                    <th className="py-2 px-3 text-right">Paid</th>
                    <th className="py-2 px-3 text-right font-black text-amber-800">Pending Due</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingPayments.slice(0, 5).map((p) => {
                    const rem = p.remaining_amount !== undefined ? p.remaining_amount : p.amount;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{p.emp_code}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{p.employee_name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{p.department}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          ••••{p.bank_account_no ? p.bank_account_no.slice(-4) : 'N/A'} • {p.bank_ifsc}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                          ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                          ₹{(p.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-800">
                          ₹{rem.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedPayRecord(p)}
                            className="px-3 py-1 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-lg text-[11px] shadow-xs transition cursor-pointer"
                          >
                            Pay Now
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Alerts & Critical Notices */}
      {alerts && alerts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Operational & Statutory Alerts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs flex items-start space-x-3 text-xs"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-800">{alert.title}</div>
                  <div className="text-slate-600 mt-0.5 leading-relaxed">{alert.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Payroll Expenditure Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Labour & Salary Expenditure</h3>
              <p className="text-xs text-slate-500">Gross vs Net distribution over past payroll periods</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="gross"
                  name="Gross Salary"
                  stroke="#047857"
                  fillOpacity={1}
                  fill="url(#colorGross)"
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  name="Net Salary"
                  stroke="#d97706"
                  fillOpacity={1}
                  fill="url(#colorNet)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workforce Category Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Workforce Category Breakdown</h3>
            <p className="text-xs text-slate-500">Skilled, Daily Wage, Contract vs Salaried</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={category_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {category_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attendance & Department Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Attendance Trend</h3>
              <p className="text-xs text-slate-500">Daily muster presence & overtime hours</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendance_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                <Legend />
                <Bar dataKey="present" name="Present Workers" fill="#047857" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Costs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Department Labour Cost Breakdown</h3>
              <p className="text-xs text-slate-500">Gross expenditure per factory division</p>
            </div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {department_costs.map((dept, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{dept.department}</span>
                  <span className="text-[10px] text-slate-400 block">{dept.employees} deployed</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900">
                    ₹{dept.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* One-Tap Pay Modal */}
      <OneTapPayModal
        isOpen={isOneTapModalOpen}
        onClose={() => setIsOneTapModalOpen(false)}
        onSuccess={() => loadDashboard()}
        onViewReceipt={handleOpenReceipt}
      />

      {/* Individual Employee Pay Now Modal */}
      <SinglePayModal
        isOpen={!!selectedPayRecord}
        onClose={() => setSelectedPayRecord(null)}
        payment={selectedPayRecord}
        onSuccess={() => loadDashboard()}
        onViewReceipt={handleOpenReceipt}
      />

      {/* Official Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={activeReceipt}
      />
    </div>
  );
};
