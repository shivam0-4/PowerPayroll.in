import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AttendanceRecord, Department } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Calendar,
  CheckCircle2,
  Lock,
  Clock,
  Save,
  CheckSquare,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Monthly View State
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);
  const [isApprovedMonth, setIsApprovedMonth] = useState(false);

  // Approval Modal
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  const { isRole } = useAuth();
  const { showToast } = useToast();

  const currentDateObj = new Date(selectedDate);
  const currentMonth = currentDateObj.getMonth() + 1;
  const currentYear = currentDateObj.getFullYear();

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (viewMode === 'daily') {
      loadDailyAttendance();
    } else {
      loadMonthlyAttendance();
    }
  }, [selectedDate, selectedDept, viewMode]);

  const loadDepartments = async () => {
    try {
      const res = await api.getDepartments();
      setDepartments(res.departments);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDailyAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.getDailyAttendance(selectedDate, selectedDept ? Number(selectedDept) : undefined);
      setRecords(res.records);
      setSummary(res.summary);
    } catch (err: any) {
      showToast(err.message || 'Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.getMonthlyAttendanceSummary(
        currentMonth,
        currentYear,
        selectedDept ? Number(selectedDept) : undefined
      );
      setMonthlyRecords(res.records);
      setIsApprovedMonth(res.is_approved);
    } catch (err: any) {
      showToast(err.message || 'Failed to load monthly summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (index: number, newStatus: AttendanceRecord['status']) => {
    const updated = [...records];
    updated[index].status = newStatus;
    if (newStatus === 'Half Day') {
      updated[index].working_hours = 4.0;
    } else if (newStatus === 'Present') {
      updated[index].working_hours = 8.0;
    } else if (newStatus === 'Absent') {
      updated[index].working_hours = 0.0;
      updated[index].overtime_hours = 0.0;
    }
    setRecords(updated);
  };

  const handleOtChange = (index: number, ot: number) => {
    const updated = [...records];
    updated[index].overtime_hours = Math.max(0, ot);
    setRecords(updated);
  };

  const handleMarkAllPresent = () => {
    const updated = records.map((r) => ({
      ...r,
      status: 'Present' as const,
      working_hours: 8.0,
    }));
    setRecords(updated);
    showToast('All workers marked Present in memory. Click Save to persist.', 'info');
  };

  const handleSaveDaily = async () => {
    try {
      setSaving(true);
      const payload = records.map((r) => ({
        employee_id: r.employee_id,
        date: selectedDate,
        status: r.status,
        working_hours: r.working_hours,
        overtime_hours: r.overtime_hours,
        shift: r.shift,
        remarks: r.remarks,
      }));

      await api.bulkMarkAttendance(payload);
      showToast('Daily attendance saved successfully', 'success');
      loadDailyAttendance();
    } catch (err: any) {
      showToast(err.message || 'Failed to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveMonth = async () => {
    try {
      await api.approveAttendance({
        month: currentMonth,
        year: currentYear,
        department_id: selectedDept ? Number(selectedDept) : undefined,
        notes: approvalNotes,
      });
      showToast(`Attendance for ${currentMonth}/${currentYear} locked & approved`, 'success');
      setIsApproveModalOpen(false);
      loadMonthlyAttendance();
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Attendance Register & Biometric Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record shifts, monitor daily wages payable, calculate overtime, and lock approved monthly muster rolls
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-200/80 p-1 rounded-xl flex text-xs font-bold">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'daily' ? 'bg-white text-brand-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Register
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'monthly' ? 'bg-white text-brand-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Muster Roll
            </button>
          </div>

          {viewMode === 'daily' && isRole('Super Admin', 'HR Manager', 'Payroll Manager') && (
            <button
              onClick={handleSaveDaily}
              disabled={saving}
              className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Register'}</span>
            </button>
          )}

          {viewMode === 'monthly' && isRole('Super Admin', 'HR Manager') && (
            <button
              onClick={() => setIsApproveModalOpen(true)}
              disabled={isApprovedMonth}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isApprovedMonth ? 'Month Locked & Approved' : 'Approve & Lock Month'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.department_name}
              </option>
            ))}
          </select>
        </div>

        {viewMode === 'daily' && isRole('Super Admin', 'HR Manager', 'Payroll Manager') && (
          <button
            onClick={handleMarkAllPresent}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center space-x-1"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </button>
        )}
      </div>

      {/* Daily Summary Badges */}
      {viewMode === 'daily' && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Staff</span>
            <span className="text-lg font-black text-slate-800">{summary.total}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
            <span className="text-[10px] text-emerald-600 uppercase font-bold block">Present</span>
            <span className="text-lg font-black text-emerald-700">{summary.present}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-xs">
            <span className="text-[10px] text-rose-600 uppercase font-bold block">Absent</span>
            <span className="text-lg font-black text-rose-700">{summary.absent}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs">
            <span className="text-[10px] text-amber-600 uppercase font-bold block">Half Day</span>
            <span className="text-lg font-black text-amber-700">{summary.half_day}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-xs">
            <span className="text-[10px] text-teal-600 uppercase font-bold block">Paid Leaves / Off</span>
            <span className="text-lg font-black text-teal-700">{summary.paid_leave + summary.weekly_off}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gold-100 shadow-xs">
            <span className="text-[10px] text-gold-700 uppercase font-bold block">Overtime Hours</span>
            <span className="text-lg font-black text-gold-800">{summary.total_ot_hours} hrs</span>
          </div>
        </div>
      )}

      {/* Table: Daily Register */}
      {viewMode === 'daily' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Worker Name</th>
                  <th className="py-3 px-4">Department & Wage</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Work Hours</th>
                  <th className="py-3 px-4">Overtime (Hours)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      Loading daily register...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No worker records found for this date.
                    </td>
                  </tr>
                ) : (
                  records.map((rec, idx) => (
                    <tr key={rec.employee_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold text-brand-900 font-mono">
                        {rec.emp_code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{rec.full_name}</div>
                        <div className="text-[10px] text-slate-500">{rec.designation}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{rec.department_name}</div>
                        <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                          {rec.wage_type === 'daily_wage' ? 'Daily Wage' : 'Monthly Salary'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(['Present', 'Absent', 'Half Day', 'Weekly Off', 'Paid Leave'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(idx, st)}
                              disabled={rec.is_locked}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                rec.status === st
                                  ? st === 'Present'
                                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                                    : st === 'Absent'
                                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                    : st === 'Half Day'
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                    : 'bg-teal-700 text-white border-teal-800 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              } disabled:opacity-60`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                          {rec.shift}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {rec.working_hours}h
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-gold-600" />
                          <input
                            type="number"
                            min="0"
                            max="16"
                            step="0.5"
                            value={rec.overtime_hours}
                            onChange={(e) => handleOtChange(idx, parseFloat(e.target.value) || 0)}
                            disabled={rec.is_locked}
                            className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg font-bold text-gold-800 text-center focus:outline-none focus:ring-1 focus:ring-brand-700"
                          />
                          <span className="text-[10px] text-slate-400">hrs</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table: Monthly Muster Roll */}
      {viewMode === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Monthly Attendance & Payable Days Summary: {currentMonth}/{currentYear}
              </h3>
              <p className="text-xs text-slate-500">
                Total aggregate of Present, Half days (0.5), Weekly off, and Overtime
              </p>
            </div>
            {isApprovedMonth && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center space-x-1">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Locked by Supervisor</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Wage Type</th>
                  <th className="py-3 px-4 text-center">Present</th>
                  <th className="py-3 px-4 text-center">Half Day</th>
                  <th className="py-3 px-4 text-center">Weekly Off</th>
                  <th className="py-3 px-4 text-center">Paid Leave</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-center font-bold text-emerald-700">Payable Days</th>
                  <th className="py-3 px-4 text-center font-bold text-gold-700">Overtime Hrs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyRecords.map((m) => (
                  <tr key={m.employee_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold font-mono text-brand-900">{m.emp_code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{m.full_name}</td>
                    <td className="py-3 px-4 text-slate-500 uppercase text-[10px]">{m.wage_type}</td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-700">{m.present_days}</td>
                    <td className="py-3 px-4 text-center text-amber-600">{m.half_days}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{m.weekly_off}</td>
                    <td className="py-3 px-4 text-center text-teal-600">{m.paid_leave}</td>
                    <td className="py-3 px-4 text-center text-rose-600 font-semibold">{m.absent_days}</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-800 bg-emerald-50/50">
                      {m.payable_days}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-gold-700 bg-gold-50/50">
                      {m.overtime_hours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Month Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title={`Approve & Lock Attendance for ${currentMonth}/${currentYear}`}
        subtitle="Once locked, daily logs cannot be altered without Super Admin intervention"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <div className="font-bold flex items-center space-x-1.5 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Permanent Locking Notice</span>
            </div>
            Approving this attendance cycle locks all worker day registers and sends verified payable days to the Payroll Engine.
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Approval Notes / Supervisor Remarks</label>
            <textarea
              rows={3}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. All muster records verified against biometrics"
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-700"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setIsApproveModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveMonth}
              className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:bg-emerald-800"
            >
              Confirm & Lock Month
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
