import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Company, Department, WorkLocation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { Building2, MapPin, Layers, Save, Plus, CheckCircle2 } from 'lucide-react';

export const CompanySettings: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Department Modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Location Modal
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locState, setLocState] = useState('Gujarat');
  const [locAddress, setLocAddress] = useState('');

  const { isRole } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [compRes, deptRes, locRes] = await Promise.all([
        api.getCompany(),
        api.getDepartments(),
        api.getLocations(),
      ]);
      setCompany(compRes.company);
      setDepartments(deptRes.departments);
      setLocations(locRes.locations);
    } catch (err: any) {
      showToast(err.message || 'Failed to load company details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    try {
      setSaving(true);
      await api.updateCompany(company);
      showToast('Company profile & compliance identifiers saved', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update company', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDepartment({
        department_name: deptName,
        code: deptCode,
        description: deptDesc,
      });
      showToast('Department added', 'success');
      setIsDeptModalOpen(false);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create department', 'error');
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLocation({
        location_name: locName,
        code: locCode,
        city: locCity,
        state: locState,
        address: locAddress,
      });
      showToast('Plant location added', 'success');
      setIsLocModalOpen(false);
      setLocName('');
      setLocCode('');
      setLocCity('');
      setLocAddress('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create location', 'error');
    }
  };

  if (loading || !company) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-800 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Company Master & Plant Configurations</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage corporate profile, GST/TAN/PAN details, EPFO/ESIC codes, factory divisions, and locations
        </p>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-brand-800" />
            <h3 className="font-bold text-sm text-slate-900">Corporate Master Identity</h3>
          </div>
          {isRole('Super Admin') && (
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Company Registered Name</label>
            <input
              type="text"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">GSTIN Number</label>
            <input
              type="text"
              value={company.gst_no || ''}
              onChange={(e) => setCompany({ ...company, gst_no: e.target.value.toUpperCase() })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Company PAN</label>
            <input
              type="text"
              value={company.pan_no || ''}
              onChange={(e) => setCompany({ ...company, pan_no: e.target.value.toUpperCase() })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">PF Establishment Code</label>
            <input
              type="text"
              value={company.pf_establishment_code || ''}
              onChange={(e) => setCompany({ ...company, pf_establishment_code: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ESIC Employer Code</label>
            <input
              type="text"
              value={company.esic_employer_code || ''}
              onChange={(e) => setCompany({ ...company, esic_employer_code: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Corporate Bank Account</label>
            <input
              type="text"
              value={company.bank_account_no || ''}
              onChange={(e) => setCompany({ ...company, bank_account_no: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Bank Name & Branch</label>
            <input
              type="text"
              value={company.bank_name || ''}
              onChange={(e) => setCompany({ ...company, bank_name: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Bank IFSC Code</label>
            <input
              type="text"
              value={company.bank_ifsc || ''}
              onChange={(e) => setCompany({ ...company, bank_ifsc: e.target.value.toUpperCase() })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Default Overtime Multiplier</label>
            <input
              type="number"
              step="0.1"
              value={company.default_overtime_multiplier || 2.0}
              onChange={(e) => setCompany({ ...company, default_overtime_multiplier: parseFloat(e.target.value) || 2.0 })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div className="col-span-full">
            <label className="font-bold text-slate-700 block mb-1">Registered Address</label>
            <textarea
              rows={2}
              value={company.registered_address || ''}
              onChange={(e) => setCompany({ ...company, registered_address: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>
        </div>
      </form>

      {/* Locations & Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plant Locations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-brand-800" />
              <h3 className="font-bold text-xs text-slate-800">Plant & Work Locations</h3>
            </div>
            {isRole('Super Admin', 'HR Manager') && (
              <button
                onClick={() => setIsLocModalOpen(true)}
                className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold rounded-lg text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Plant</span>
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {locations.map((loc) => (
              <div key={loc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900">{loc.location_name}</div>
                  <div className="text-[10px] text-slate-500">{loc.city}, {loc.state} • {loc.address}</div>
                </div>
                <span className="font-mono font-bold text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                  {loc.code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Departments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-brand-800" />
              <h3 className="font-bold text-xs text-slate-800">Departments & Line Divisions</h3>
            </div>
            {isRole('Super Admin', 'HR Manager') && (
              <button
                onClick={() => setIsDeptModalOpen(true)}
                className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold rounded-lg text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {departments.map((d) => (
              <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900">{d.department_name}</div>
                  <div className="text-[10px] text-slate-500">{d.description || 'Core division'}</div>
                </div>
                <span className="font-mono font-bold text-[10px] bg-brand-100 text-brand-800 px-2 py-0.5 rounded">
                  {d.code}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Department / Operational Line"
      >
        <form onSubmit={handleAddDept} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Department Name</label>
            <input
              type="text"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Code</label>
            <input
              type="text"
              required
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
              className="w-full p-2 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Description</label>
            <input
              type="text"
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Save Department
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Location Modal */}
      <Modal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title="Add Manufacturing / Construction Work Location"
      >
        <form onSubmit={handleAddLocation} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Plant Location Name</label>
            <input
              type="text"
              required
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Code</label>
              <input
                type="text"
                required
                value={locCode}
                onChange={(e) => setLocCode(e.target.value.toUpperCase())}
                className="w-full p-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                value={locCity}
                onChange={(e) => setLocCity(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">State Jurisdiction</label>
            <input
              type="text"
              value={locState}
              onChange={(e) => setLocState(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Full Postal Address</label>
            <textarea
              rows={2}
              value={locAddress}
              onChange={(e) => setLocAddress(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLocModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Save Plant Location
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
