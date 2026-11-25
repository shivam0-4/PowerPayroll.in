import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { PayrollPeriod } from '../types';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Table,
  Building,
  Users,
  CreditCard,
  Scale,
  Calendar,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [salaryRegisterData, setSalaryRegisterData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadSalaryRegister(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    try {
      const res = await api.getPayrollPeriods();
      setPeriods(res.periods);
      if (res.periods.length > 0) {
        setSelectedPeriodId(res.periods[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSalaryRegister = async (periodId: number) => {
    try {
      setLoading(true);
      const res = await api.getSalaryRegister(periodId);
      setSalaryRegisterData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load salary register', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Statutory & Enterprise Reports Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Download EPFO ECR format, ESIC return statements, monthly muster registers, and bank payment statements
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriodId || ''}
            onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-brand-900"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.period_label}
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Quick Download Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 no-print">
        {/* Salary Register */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center space-x-2 text-brand-900">
            <Table className="w-5 h-5 text-brand-800" />
            <h4 className="font-bold text-xs">Monthly Salary Register</h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Comprehensive register with payable days, basic, allowances, PF, ESIC, PT, and net salary.
          </p>
          {selectedPeriodId && (
            <a
              href={`/api/reports/salary-register/${selectedPeriodId}/csv`}
              download
              className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-900 font-bold rounded-lg text-xs text-center flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Register CSV</span>
            </a>
          )}
        </div>

        {/* Bank Transfer Statement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center space-x-2 text-slate-900">
            <CreditCard className="w-5 h-5 text-emerald-700" />
            <h4 className="font-bold text-xs">Bank Transfer NEFT Format</h4>
          </div>
          <p className="text-[11px] text-slate-500">
            SBI / HDFC corporate banking upload file with beneficiary accounts, IFSC, and amounts.
          </p>
          {selectedPeriodId && (
            <a
              href={`/api/payments/export/bank-statement/${selectedPeriodId}`}
              download
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg text-xs text-center flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Bank CSV</span>
            </a>
          )}
        </div>

        {/* EPF ECR Statement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center space-x-2 text-slate-900">
            <Scale className="w-5 h-5 text-blue-700" />
            <h4 className="font-bold text-xs">EPF ECR Return Export</h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Official EPFO electronic challan format with UAN, EPF/EPS wage base, and 12% shares.
          </p>
          {selectedPeriodId && (
            <a
              href={`/api/reports/statutory/pf/${selectedPeriodId}`}
              download
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg text-xs text-center flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download EPFO CSV</span>
            </a>
          )}
        </div>

        {/* Employee Master Export */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center space-x-2 text-slate-900">
            <Users className="w-5 h-5 text-amber-700" />
            <h4 className="font-bold text-xs">Employee Master Register</h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Complete workforce list with statutory IDs, Aadhaar/PAN references, and categories.
          </p>
          <a
            href="/api/employees/export/csv"
            download
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-xs text-center flex items-center justify-center space-x-1 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Master CSV</span>
          </a>
        </div>
      </div>

      {/* Salary Register View Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden printable-area">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              GROUPON POWER - Monthly Salary Register ({salaryRegisterData?.period?.period_label})
            </h3>
            <p className="text-xs text-slate-500">
              Form B / Form C statutory salary register under Payment of Wages Act
            </p>
          </div>
          {salaryRegisterData?.summary && (
            <div className="flex space-x-4 text-xs font-bold font-mono">
              <span>Gross: ₹{salaryRegisterData.summary.total_gross?.toLocaleString('en-IN')}</span>
              <span>Ded: ₹{salaryRegisterData.summary.total_deductions?.toLocaleString('en-IN')}</span>
              <span className="text-emerald-800">Net: ₹{salaryRegisterData.summary.total_net?.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-3">Emp ID</th>
                <th className="py-3 px-3">Worker Name</th>
                <th className="py-3 px-3">Dept</th>
                <th className="py-3 px-3">Days</th>
                <th className="py-3 px-3 text-right">Gross</th>
                <th className="py-3 px-3 text-right">PF</th>
                <th className="py-3 px-3 text-right">ESIC</th>
                <th className="py-3 px-3 text-right">PT</th>
                <th className="py-3 px-3 text-right">Advance</th>
                <th className="py-3 px-3 text-right">Total Ded</th>
                <th className="py-3 px-3 text-right font-black text-emerald-800">Net Payable</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Remaining</th>
                <th className="py-3 px-3 text-center">Pay Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={14} className="text-center py-10 text-slate-400">
                    Generating report table...
                  </td>
                </tr>
              ) : salaryRegisterData?.rows?.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-10 text-slate-400">
                    No salary records for this period.
                  </td>
                </tr>
              ) : (
                salaryRegisterData?.rows?.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{r.employee_code}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{r.full_name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{r.department}</td>
                    <td className="py-2.5 px-3 font-bold">{r.payable_days}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{r.gross_earnings.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">₹{r.pf_deduction.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">₹{r.esic_deduction.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">₹{r.pt_deduction.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-amber-700">₹{r.advance_recovery.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">₹{r.total_deductions.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-800 text-sm">
                      ₹{r.net_salary.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {r.paid_amount != null ? `₹${Number(r.paid_amount).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      {r.remaining_amount != null ? `₹${Number(r.remaining_amount).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge status={r.payment_status || 'UNPAID'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
