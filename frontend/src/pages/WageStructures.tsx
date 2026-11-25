import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Employee, SalaryStructure } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { Sliders, Edit2, DollarSign, Calculator, CheckCircle2 } from 'lucide-react';

export const WageStructures: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Wage structure form
  const [basicPay, setBasicPay] = useState<number>(0);
  const [da, setDa] = useState<number>(0);
  const [hra, setHra] = useState<number>(0);
  const [conveyance, setConveyance] = useState<number>(0);
  const [specialAllowance, setSpecialAllowance] = useState<number>(0);
  const [otherAllowances, setOtherAllowances] = useState<number>(0);
  const [incentive, setIncentive] = useState<number>(0);
  const [productionBonus, setProductionBonus] = useState<number>(0);
  const [otRateHour, setOtRateHour] = useState<number>(0);

  const { isRole } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployees();
      setEmployees(res.employees);
    } catch (err: any) {
      showToast(err.message || 'Failed to load workers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = async (emp: Employee) => {
    setSelectedEmployee(emp);
    try {
      const res = await api.getEmployee(emp.id);
      const struct = res.employee.salary_structure;
      if (struct) {
        setBasicPay(struct.basic_pay || 0);
        setDa(struct.da || 0);
        setHra(struct.hra || 0);
        setConveyance(struct.conveyance || 0);
        setSpecialAllowance(struct.special_allowance || 0);
        setOtherAllowances(struct.other_allowances || 0);
        setIncentive(struct.incentive || 0);
        setProductionBonus(struct.production_bonus || 0);
        setOtRateHour(struct.overtime_rate_per_hour || 0);
      } else {
        setBasicPay(emp.wage_type === 'daily_wage' ? (emp.daily_wage_rate || 0) : (emp.monthly_salary || 0));
        setDa(0);
        setHra(0);
        setConveyance(0);
        setSpecialAllowance(0);
        setOtherAllowances(0);
        setIncentive(0);
        setProductionBonus(0);
        setOtRateHour(0);
      }
      setIsEditModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch details', 'error');
    }
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      await api.updateEmployee(selectedEmployee.id, {
        daily_wage_rate: selectedEmployee.wage_type === 'daily_wage' ? basicPay : 0,
        monthly_salary: selectedEmployee.wage_type === 'monthly_salary' ? basicPay : 0,
        salary_structure: {
          basic_pay: basicPay,
          da,
          hra,
          conveyance,
          special_allowance: specialAllowance,
          other_allowances: otherAllowances,
          incentive,
          production_bonus: productionBonus,
          overtime_rate_per_hour: otRateHour,
        },
      });
      showToast('Wage structure configured successfully', 'success');
      setIsEditModalOpen(false);
      loadEmployees();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Wage Structures & Compensation Matrix</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure daily wages, monthly pay scales, DA, HRA, overtime multipliers, and performance production bonuses
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Code & Name</th>
                <th className="py-3 px-4">Department & Category</th>
                <th className="py-3 px-4">Wage Model</th>
                <th className="py-3 px-4 text-right">Base Wage / Salary</th>
                <th className="py-3 px-4 text-center">PF / ESI Coverage</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Loading wage structures...
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{emp.full_name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{emp.emp_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{emp.designation}</div>
                      <div className="text-[10px] text-slate-500">{emp.department_name} • {emp.employment_category}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-[11px] uppercase text-slate-700">
                        {emp.wage_type === 'daily_wage' ? 'Daily Wage' : 'Monthly Salaried'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {emp.wage_type === 'daily_wage' ? (
                        <div className="font-black text-emerald-800 text-sm">
                          ₹{emp.daily_wage_rate} <span className="text-[10px] text-slate-400 font-normal">/ day</span>
                        </div>
                      ) : (
                        <div className="font-black text-slate-900 text-sm">
                          ₹{emp.monthly_salary?.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">/ month</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center space-x-1 text-[10px] font-bold">
                        {emp.pf_applicable ? (
                          <span className="text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">EPF 12%</span>
                        ) : (
                          <span className="text-slate-300">No PF</span>
                        )}
                        {emp.esic_applicable ? (
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">ESI 0.75%</span>
                        ) : (
                          <span className="text-slate-300">No ESI</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isRole('Super Admin', 'Accountant', 'HR Manager', 'Payroll Manager') && (
                        <button
                          onClick={() => openEditModal(emp)}
                          className="px-3 py-1.5 bg-brand-50 text-brand-800 hover:bg-brand-100 font-bold rounded-lg text-xs transition"
                        >
                          Configure Components
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

      {/* Edit Structure Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Wage Structure: ${selectedEmployee?.full_name} (${selectedEmployee?.emp_code})`}
        subtitle={`Wage Type: ${selectedEmployee?.wage_type === 'daily_wage' ? 'Daily Wage Worker' : 'Monthly Salary Employee'}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveStructure} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {selectedEmployee?.wage_type === 'daily_wage' ? 'Basic Daily Wage (₹)' : 'Monthly Basic Pay (₹)'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={basicPay}
                onChange={(e) => setBasicPay(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Dearness Allowance - DA (₹)</label>
              <input
                type="number"
                step="0.01"
                value={da}
                onChange={(e) => setDa(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">House Rent Allowance - HRA (₹)</label>
              <input
                type="number"
                step="0.01"
                value={hra}
                onChange={(e) => setHra(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Conveyance Allowance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={conveyance}
                onChange={(e) => setConveyance(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Special / Plant Allowance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={specialAllowance}
                onChange={(e) => setSpecialAllowance(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Production Bonus / Incentive (₹)</label>
              <input
                type="number"
                step="0.01"
                value={productionBonus}
                onChange={(e) => setProductionBonus(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="font-bold text-slate-700 block mb-1">
              Custom Overtime Rate Per Hour (₹) (0 for automated 2x regular hourly rate)
            </label>
            <input
              type="number"
              step="0.01"
              value={otRateHour}
              onChange={(e) => setOtRateHour(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-slate-200 rounded-xl font-bold text-gold-800"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Save Structure
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
