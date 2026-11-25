import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Employee, Department, WorkLocation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit2,
  Power,
  ShieldCheck,
  Building,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWageType, setSelectedWageType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    full_name: '',
    father_name: '',
    phone: '',
    email: '',
    designation: '',
    department_id: '',
    location_id: '',
    employment_category: 'Daily Wage Worker',
    employment_type: 'Full-Time',
    wage_type: 'daily_wage',
    daily_wage_rate: 600,
    monthly_salary: 0,
    gender: 'Male',
    join_date: new Date().toISOString().split('T')[0],
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    uan: '',
    esic_ip_number: '',
    pan: '',
    pf_applicable: true,
    esic_applicable: true,
    pt_applicable: true,
    tds_applicable: false,
  });

  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'financial'>('personal');
  const [importRowsJson, setImportRowsJson] = useState('');

  const { isRole } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, locRes] = await Promise.all([
        api.getEmployees(),
        api.getDepartments(),
        api.getLocations(),
      ]);
      setEmployees(empRes.employees);
      setDepartments(deptRes.departments);
      setLocations(locRes.locations);
    } catch (err: any) {
      showToast(err.message || 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedDept) params.department_id = selectedDept;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedWageType) params.wage_type = selectedWageType;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.getEmployees(params);
      setEmployees(res.employees);
    } catch (err: any) {
      showToast(err.message || 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditModalOpen && selectedEmployee) {
        await api.updateEmployee(selectedEmployee.id, formData);
        showToast('Employee updated successfully', 'success');
        setIsEditModalOpen(false);
      } else {
        await api.createEmployee(formData);
        showToast('Employee added successfully', 'success');
        setIsAddModalOpen(false);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    if (!confirm(`Are you sure you want to ${emp.is_active ? 'deactivate' : 'activate'} ${emp.full_name}?`)) {
      return;
    }
    try {
      await api.toggleEmployeeStatus(emp.id);
      showToast(`Employee ${emp.is_active ? 'deactivated' : 'activated'}`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const openEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      ...emp,
      department_id: emp.department_id || '',
      location_id: emp.location_id || '',
    });
    setIsEditModalOpen(true);
  };

  const openView = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsViewModalOpen(true);
  };

  const handleImportSubmit = async () => {
    try {
      const parsed = JSON.parse(importRowsJson);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array of employee objects');
      const res = await api.bulkImportEmployees(parsed);
      showToast(res.message, 'success');
      setIsImportModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Invalid JSON format', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workforce & Employee Master</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage permanent staff, skilled & unskilled labour, daily wage workers, and contract personnel
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/api/employees/export/csv"
            download
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          {isRole('Super Admin', 'HR Manager') && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk Import</span>
              </button>

              <button
                onClick={() => {
                  setFormData({
                    full_name: '',
                    father_name: '',
                    phone: '',
                    email: '',
                    designation: '',
                    department_id: departments[0]?.id || '',
                    location_id: locations[0]?.id || '',
                    employment_category: 'Daily Wage Worker',
                    employment_type: 'Full-Time',
                    wage_type: 'daily_wage',
                    daily_wage_rate: 650,
                    monthly_salary: 0,
                    gender: 'Male',
                    join_date: new Date().toISOString().split('T')[0],
                    bank_name: 'State Bank of India',
                    bank_account_no: '',
                    bank_ifsc: 'SBIN0001234',
                    uan: '',
                    esic_ip_number: '',
                    pan: '',
                    pf_applicable: true,
                    esic_applicable: true,
                    pt_applicable: true,
                    tds_applicable: false,
                  });
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, employee code, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-700 focus:bg-white"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.department_name}
              </option>
            ))}
          </select>

          {/* Wage Type */}
          <select
            value={selectedWageType}
            onChange={(e) => setSelectedWageType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          >
            <option value="">All Wage Types</option>
            <option value="daily_wage">Daily Wage</option>
            <option value="monthly_salary">Monthly Salary</option>
          </select>

          {/* Status */}
          <div className="flex space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-3.5 py-2 bg-brand-800 text-gold-400 rounded-xl text-xs font-bold hover:bg-brand-900 transition flex items-center justify-center flex-shrink-0"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Wage Structure</th>
                <th className="py-3 px-4">Statutory Eligibility</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Loading workforce directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No employees matching the criteria found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-brand-900 font-mono">
                      {emp.emp_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{emp.full_name}</div>
                      <div className="text-[10px] text-slate-400">{emp.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{emp.designation}</div>
                      <div className="text-[10px] text-slate-500">{emp.department_name || 'Unassigned'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {emp.employment_category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {emp.wage_type === 'daily_wage' ? (
                        <div>
                          <span className="font-bold text-emerald-700">₹{emp.daily_wage_rate}</span>
                          <span className="text-[10px] text-slate-400"> / day</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-800">₹{emp.monthly_salary?.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400"> / month</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-1 text-[10px] font-bold">
                        {emp.pf_applicable && <span className="text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">PF</span>}
                        {emp.esic_applicable && <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">ESI</span>}
                        {emp.pt_applicable && <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">PT</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={emp.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openView(emp)}
                        title="View Profile"
                        className="p-1.5 text-slate-400 hover:text-brand-800 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isRole('Super Admin', 'HR Manager', 'Payroll Manager') && (
                        <button
                          onClick={() => openEdit(emp)}
                          title="Edit Employee"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {isRole('Super Admin', 'HR Manager') && (
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          title={emp.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition ${
                            emp.is_active
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-4 h-4" />
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

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? `Edit Employee (${selectedEmployee?.emp_code})` : 'Register New Employee'}
        subtitle="Ensure compliance details and statutory wage mappings are verified"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`pb-2 px-4 border-b-2 transition ${
                activeTab === 'personal'
                  ? 'border-brand-800 text-brand-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              1. Personal & Contact
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('employment')}
              className={`pb-2 px-4 border-b-2 transition ${
                activeTab === 'employment'
                  ? 'border-brand-800 text-brand-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              2. Employment & Role
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('financial')}
              className={`pb-2 px-4 border-b-2 transition ${
                activeTab === 'financial'
                  ? 'border-brand-800 text-brand-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              3. Wage & Bank Details
            </button>
          </div>

          {/* Tab 1: Personal */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Father's Name</label>
                <input
                  type="text"
                  value={formData.father_name || ''}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob || ''}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Address / Worker Colony</label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Employment */}
          {activeTab === 'employment' && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Designation *</label>
                <input
                  type="text"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Work Location</label>
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Plant Location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.location_name} ({l.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Workforce Category</label>
                <select
                  value={formData.employment_category}
                  onChange={(e) => setFormData({ ...formData, employment_category: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="Daily Wage Worker">Daily Wage Worker</option>
                  <option value="Skilled Worker">Skilled Worker</option>
                  <option value="Semi-Skilled Worker">Semi-Skilled Worker</option>
                  <option value="Unskilled Worker">Unskilled Worker</option>
                  <option value="Contract Labour">Contract Labour</option>
                  <option value="Monthly Salary Employee">Monthly Salary Employee</option>
                  <option value="Permanent Employee">Permanent Employee</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Joining Date</label>
                <input
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Supervisor Name</label>
                <input
                  type="text"
                  value={formData.supervisor_name || ''}
                  onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Financial & Statutory */}
          {activeTab === 'financial' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Wage Type</label>
                  <select
                    value={formData.wage_type}
                    onChange={(e) => setFormData({ ...formData, wage_type: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="daily_wage">Daily Wage Rate</option>
                    <option value="monthly_salary">Monthly Salary</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {formData.wage_type === 'daily_wage' ? 'Daily Wage Rate (₹)' : 'Monthly Basic Salary (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.wage_type === 'daily_wage' ? formData.daily_wage_rate : formData.monthly_salary}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (formData.wage_type === 'daily_wage') {
                        setFormData({ ...formData, daily_wage_rate: val });
                      } else {
                        setFormData({ ...formData, monthly_salary: val });
                      }
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="font-bold text-slate-800 mb-2">Bank Account for Salary Disbursal</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={formData.bank_name || ''}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank_account_no || ''}
                      onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="SBIN0001234"
                      value={formData.bank_ifsc || ''}
                      onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="font-bold text-slate-800 mb-2">Statutory Identifiers & Applicability</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">UAN (PF Number)</label>
                    <input
                      type="text"
                      value={formData.uan || ''}
                      onChange={(e) => setFormData({ ...formData, uan: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">ESIC IP Number</label>
                    <input
                      type="text"
                      value={formData.esic_ip_number || ''}
                      onChange={(e) => setFormData({ ...formData, esic_ip_number: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">PAN Card</label>
                    <input
                      type="text"
                      value={formData.pan || ''}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.pf_applicable}
                      onChange={(e) => setFormData({ ...formData, pf_applicable: e.target.checked })}
                      className="rounded text-brand-800"
                    />
                    <span className="font-semibold text-slate-700">PF Eligible</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.esic_applicable}
                      onChange={(e) => setFormData({ ...formData, esic_applicable: e.target.checked })}
                      className="rounded text-brand-800"
                    />
                    <span className="font-semibold text-slate-700">ESIC Eligible</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.pt_applicable}
                      onChange={(e) => setFormData({ ...formData, pt_applicable: e.target.checked })}
                      className="rounded text-brand-800"
                    />
                    <span className="font-semibold text-slate-700">Prof. Tax (PT)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl hover:bg-brand-900 text-xs shadow-md"
            >
              Save Employee Record
            </button>
          </div>
        </form>
      </Modal>

      {/* View Profile Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Employee Profile: ${selectedEmployee?.full_name}`}
        subtitle={`Emp Code: ${selectedEmployee?.emp_code}`}
        maxWidth="lg"
      >
        {selectedEmployee && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Designation</span>
                <span className="font-bold text-slate-800">{selectedEmployee.designation}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                <span className="font-bold text-slate-800">{selectedEmployee.department_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-bold text-slate-800">{selectedEmployee.employment_category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Wage Type</span>
                <span className="font-bold text-emerald-700">
                  {selectedEmployee.wage_type === 'daily_wage'
                    ? `₹${selectedEmployee.daily_wage_rate} / day`
                    : `₹${selectedEmployee.monthly_salary} / month`}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 p-3 rounded-xl space-y-2">
              <div className="font-bold text-slate-900 border-b pb-1">Statutory & Bank Verification</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">Bank Account</span>
                  <span className="font-mono font-bold text-slate-700">{selectedEmployee.bank_account_no || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">IFSC Code</span>
                  <span className="font-mono font-bold text-slate-700">{selectedEmployee.bank_ifsc || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">UAN (PF)</span>
                  <span className="font-mono font-bold text-slate-700">{selectedEmployee.uan || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">ESIC Number</span>
                  <span className="font-mono font-bold text-slate-700">{selectedEmployee.esic_ip_number || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Employee Import"
        subtitle="Paste JSON or mapped CSV rows to import workforce records in bulk"
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Paste an array of employee objects with keys: <code>full_name</code>, <code>phone</code>,{' '}
            <code>designation</code>, <code>wage_type</code>, <code>rate</code>.
          </p>
          <textarea
            rows={8}
            placeholder={`[\n  {\n    "full_name": "Kailash Mali",\n    "phone": "9825000001",\n    "designation": "Rigger",\n    "wage_type": "daily_wage",\n    "rate": 600\n  }\n]`}
            value={importRowsJson}
            onChange={(e) => setImportRowsJson(e.target.value)}
            className="w-full p-2.5 font-mono text-[11px] border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Execute Import
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
