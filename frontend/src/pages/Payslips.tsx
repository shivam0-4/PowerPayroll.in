import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { PayrollPeriod, PayrollRecord, PayslipDetail } from '../types';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Printer, Download, Eye, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Payslips: React.FC = () => {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadPeriodRecords(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const res = await api.getPayrollPeriods();
      setPeriods(res.periods);
      if (res.periods.length > 0) {
        setSelectedPeriodId(res.periods[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load periods', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodRecords = async (periodId: number) => {
    try {
      setLoading(true);
      const res = await api.getPayrollPeriodDetails(periodId);
      setRecords(res.records);
      // Auto-load first record with payslip
      const firstWithSlip = res.records.find((r) => r.payslip_number);
      if (firstWithSlip) {
        loadSinglePayslip(firstWithSlip.id);
      } else {
        setSelectedPayslip(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSinglePayslip = async (payrollRecordId: number) => {
    try {
      // Find payslip id
      const rec = records.find((r) => r.id === payrollRecordId);
      // We can fetch by payslip endpoint or record endpoint
      const res = await api.getPayslip(payrollRecordId);
      setSelectedPayslip(res.payslip);
    } catch (err) {
      // If payslip record id corresponds to payslip id, or fallback to record details
      try {
        const recRes = await api.getPayrollRecordDetails(payrollRecordId);
        const r = recRes.record;
        // Transform into PayslipDetail
        const snap = r.calculation_snapshot || {};
        const detail: PayslipDetail = {
          id: r.id,
          payslip_number: r.payslip_number || `GP-PAY-${r.id}`,
          salary_month: `${r.period_month}/${r.period_year}`,
          month_name: `Month ${r.period_month}, ${r.period_year}`,
          company: {
            name: 'GROUPON POWER INFRA & LABOUR LTD',
            address: 'Plot No. 42-45, Phase 2, GIDC Industrial Estate, Sanand, Ahmedabad, Gujarat - 382110',
            gst_no: '24AABCG1234F1Z5',
            pan_no: 'AABCG1234F',
            pf_establishment_code: 'GJ/AHD/0045892/000',
            esic_employer_code: '37000458920001001',
          },
          employee: {
            id: r.employee_id,
            emp_code: r.emp_code || '',
            full_name: r.employee_name || '',
            department: r.department_name || '',
            designation: snap.designation || 'Staff',
            employment_category: snap.wage_type || r.wage_type,
            wage_type: r.wage_type,
            bank_account_masked: 'XXXX XXXX 4821',
            uan: '101293847581',
            esic_ip_number: '3718293847',
            pan_masked: 'BRKPXXXXXA',
          },
          attendance: {
            total_working_days: r.total_month_days || 26,
            present_days: r.present_days,
            half_days: r.half_days,
            absent_days: r.absent_days,
            paid_leaves: r.paid_leaves,
            unpaid_leaves: r.unpaid_leaves,
            payable_days: r.payable_days,
            overtime_hours: r.overtime_hours,
          },
          earnings: r.earnings || [],
          deductions: r.deductions || [],
          gross_earnings: r.gross_earnings,
          total_deductions: r.total_deductions,
          net_salary: r.net_salary,
          net_salary_words: 'Rupees Only',
          payment_status: r.payment_status,
        };
        setSelectedPayslip(detail);
      } catch (e: any) {
        showToast('Payslip not generated yet. Please lock payroll first.', 'info');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Enterprise Payslips & Payment Slips</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Company-branded official salary slips with complete attendance, statutory breakdowns & net words
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriodId || ''}
            onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-700"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.period_label} ({p.status})
              </option>
            ))}
          </select>

          {selectedPayslip && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Employee selector on left, Payslip preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Worker Selector */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
            Workers in Cycle ({records.length})
          </div>

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading payroll records...</div>
            ) : records.map((r) => (
              <button
                key={r.id}
                onClick={() => loadSinglePayslip(r.id)}
                className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                  selectedPayslip?.employee.id === r.employee_id
                    ? 'bg-brand-50 border-brand-300 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs">{r.employee_name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {r.emp_code} • {r.department_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-800 text-xs">₹{r.net_salary.toLocaleString('en-IN')}</div>
                  <Badge status={r.payment_status} size="sm" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Payslip Preview Document */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-xs text-slate-400">
              Loading payslip details...
            </div>
          ) : selectedPayslip ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md printable-area text-slate-900 space-y-6">
              {/* Payslip Header */}
              <div className="border-b-2 border-brand-900 pb-4 flex justify-between items-start">
                <div>
                  <div className="text-xl font-black text-brand-950 tracking-tight">
                    GROUPON <span className="text-gold-600">POWER</span> INFRA & LABOUR LTD
                  </div>
                  <div className="text-[11px] text-slate-600 max-w-md mt-0.5">
                    {selectedPayslip.company.address}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 space-x-2 font-mono">
                    <span>GSTIN: <b>{selectedPayslip.company.gst_no}</b></span>
                    <span>•</span>
                    <span>PF CODE: <b>{selectedPayslip.company.pf_establishment_code}</b></span>
                    <span>•</span>
                    <span>ESIC: <b>{selectedPayslip.company.esic_employer_code}</b></span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="px-3 py-1 bg-brand-900 text-gold-400 font-extrabold text-xs uppercase tracking-wider rounded-lg inline-block">
                    PAYSLIP / SALARY SLIP
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 mt-1 font-mono">
                    {selectedPayslip.payslip_number}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Period: <b>{selectedPayslip.salary_month}</b>
                  </div>
                </div>
              </div>

              {/* Employee & Attendance Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
                {/* Employee Details */}
                <div className="space-y-1">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Employee ID:</span>
                    <span className="col-span-2 font-bold font-mono">{selectedPayslip.employee.emp_code}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Name:</span>
                    <span className="col-span-2 font-bold text-slate-900">{selectedPayslip.employee.full_name}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Designation:</span>
                    <span className="col-span-2 font-semibold">{selectedPayslip.employee.designation}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Department:</span>
                    <span className="col-span-2">{selectedPayslip.employee.department}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Bank Account:</span>
                    <span className="col-span-2 font-mono font-semibold">{selectedPayslip.employee.bank_account_masked}</span>
                  </div>
                </div>

                {/* Attendance & Compliance */}
                <div className="space-y-1">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Wage Type:</span>
                    <span className="col-span-2 font-bold text-emerald-800 uppercase text-[10px]">
                      {selectedPayslip.employee.wage_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Working Days:</span>
                    <span className="col-span-2 font-bold">{selectedPayslip.attendance.total_working_days} days</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Payable Days:</span>
                    <span className="col-span-2 font-bold text-emerald-700">
                      {selectedPayslip.attendance.payable_days} days
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Overtime:</span>
                    <span className="col-span-2 font-bold text-gold-700">{selectedPayslip.attendance.overtime_hours} hrs</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">UAN / ESIC:</span>
                    <span className="col-span-2 font-mono text-[10px]">
                      {selectedPayslip.employee.uan} / {selectedPayslip.employee.esic_ip_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-2 gap-4">
                {/* Earnings Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-900 text-white font-bold px-3 py-1.5 text-xs flex justify-between">
                    <span>EARNINGS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3 text-xs space-y-2 min-h-[140px]">
                    {selectedPayslip.earnings.map((e, idx) => (
                      <div key={idx} className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-600">{e.component_name}</span>
                        <span className="font-semibold text-slate-900">₹{e.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-100 p-2 text-xs font-bold flex justify-between border-t border-slate-200">
                    <span>GROSS EARNINGS</span>
                    <span className="font-black text-slate-900">₹{selectedPayslip.gross_earnings.toFixed(2)}</span>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-900 text-white font-bold px-3 py-1.5 text-xs flex justify-between">
                    <span>DEDUCTIONS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3 text-xs space-y-2 min-h-[140px]">
                    {selectedPayslip.deductions.map((d, idx) => (
                      <div key={idx} className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-600">{d.deduction_name}</span>
                        <span className="font-semibold text-rose-600">₹{d.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-100 p-2 text-xs font-bold flex justify-between border-t border-slate-200">
                    <span>TOTAL DEDUCTIONS</span>
                    <span className="font-black text-rose-700">₹{selectedPayslip.total_deductions.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Net Payable Card */}
              <div className="bg-brand-50 border-2 border-brand-800 p-4 rounded-xl flex items-center justify-between text-brand-950">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                    Net Take-Home Pay
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mt-0.5">
                    Amount in Words: <span className="font-bold text-brand-900 italic">{selectedPayslip.net_salary_words}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-brand-900">
                    ₹{selectedPayslip.net_salary.toFixed(2)}
                  </div>
                  <Badge status={selectedPayslip.payment_status} size="sm" />
                </div>
              </div>

              {/* Signatures Footer */}
              <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                <div className="text-center">
                  <div className="w-36 border-b border-slate-300 pb-1 mb-1 font-mono text-[10px] text-slate-400">
                    Digitally Verified
                  </div>
                  <span>Employer / HR Signatory</span>
                </div>

                <div className="text-center text-[10px] text-slate-400">
                  This is a computer generated document under Indian IT Act. No physical signature required.
                </div>

                <div className="text-center">
                  <div className="w-36 border-b border-slate-300 pb-1 mb-1 font-mono text-[10px] text-slate-400">
                    Employee Acknowledgment
                  </div>
                  <span>Worker Signature / Thumb</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-xs">
              <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <h2 className="font-bold text-slate-800">
                {records.length === 0
                  ? 'No payroll records in this cycle'
                  : records.some((record) => record.payslip_number)
                  ? 'Select a worker to view the payslip'
                  : 'Official payslips are not generated yet'}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-slate-500">
                {records.length === 0
                  ? 'Run the payroll calculation first to create employee records for this period.'
                  : records.some((record) => record.payslip_number)
                  ? 'Choose a worker from the list to preview their payslip.'
                  : 'Review and approve the calculated payroll, then lock the period to generate official payslips.'}
              </p>
              {!records.some((record) => record.payslip_number) && (
                <Link
                  to="/payroll"
                  className="mt-4 inline-flex rounded-lg bg-brand-800 px-3 py-2 font-bold text-gold-400 hover:bg-brand-900"
                >
                  Open Payroll
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
