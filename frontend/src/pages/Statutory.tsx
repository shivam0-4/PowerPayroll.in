import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { StatutoryRule } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Scale, Plus, Calculator, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Statutory: React.FC = () => {
  const [rules, setRules] = useState<StatutoryRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<StatutoryRule | null>(null);

  // Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [component, setComponent] = useState('EPF');
  const [state, setState] = useState('All India');
  const [wageBase, setWageBase] = useState('Basic + DA');
  const [eeRate, setEeRate] = useState<number>(12.0);
  const [erRate, setErRate] = useState<number>(12.0);
  const [ceiling, setCeiling] = useState<number>(15000);
  const [reviewRequired, setReviewRequired] = useState<boolean>(false);

  // Sandbox Calculator Preview
  const [calcGross, setCalcGross] = useState<number>(18000);
  const [calcBasic, setCalcBasic] = useState<number>(12000);
  const [calcState, setCalcState] = useState<string>('Gujarat');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [testingPreview, setTestingPreview] = useState<boolean>(false);

  const { isRole } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadRules();
    runSandboxTest(18000, 12000, 'Gujarat');
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await api.getStatutoryRules();
      setRules(res.rules);
    } catch (err: any) {
      showToast(err.message || 'Failed to load statutory rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const runSandboxTest = async (gross: number, basic: number, st: string) => {
    try {
      setTestingPreview(true);
      const res = await api.previewStatutoryCalculation({
        gross_earnings: gross,
        basic_da_earnings: basic,
        state: st,
      });
      setPreviewResult(res.preview);
    } catch (err) {
      console.error(err);
    } finally {
      setTestingPreview(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleCode('');
    setComponent('EPF');
    setState('All India');
    setWageBase('Basic + DA');
    setEeRate(12.0);
    setErRate(12.0);
    setCeiling(15000);
    setReviewRequired(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: StatutoryRule) => {
    setEditingRule(rule);
    setRuleName(rule.rule_name);
    setRuleCode(rule.rule_code);
    setComponent(rule.statutory_component);
    setState(rule.state);
    setWageBase(rule.wage_base);
    setEeRate(rule.employee_rate);
    setErRate(rule.employer_rate);
    setCeiling(rule.ceiling_limit || 0);
    setReviewRequired(rule.requires_accountant_review);
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        rule_name: ruleName,
        rule_code: ruleCode,
        statutory_component: component,
        state,
        wage_base: wageBase,
        employee_rate: eeRate,
        employer_rate: erRate,
        ceiling_limit: ceiling > 0 ? ceiling : null,
        requires_accountant_review: reviewRequired,
      };

      if (editingRule) {
        await api.updateStatutoryRule(editingRule.id, payload);
        showToast('Statutory rule updated', 'success');
      } else {
        await api.createStatutoryRule(payload);
        showToast('Statutory rule created', 'success');
      }
      setIsModalOpen(false);
      loadRules();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurable Statutory Compliance Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic Indian statutory rules for EPF, ESIC, State Professional Tax (Gujarat/Maharashtra), and TDS
          </p>
        </div>

        {isRole('Super Admin', 'Accountant') && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Statutory Rule</span>
          </button>
        )}
      </div>

      {/* Interactive Sandbox Calculator */}
      <div className="bg-gradient-to-br from-slate-900 to-brand-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-gold-400" />
          <h3 className="font-extrabold text-sm text-white">Live Statutory Engine Sandbox Calculator</h3>
        </div>
        <p className="text-xs text-slate-400">
          Simulate statutory contributions in real-time under current effective central and state regulations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Gross Salary (₹)</label>
            <input
              type="number"
              value={calcGross}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCalcGross(val);
                runSandboxTest(val, calcBasic, calcState);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Basic + DA Pay (₹)</label>
            <input
              type="number"
              value={calcBasic}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCalcBasic(val);
                runSandboxTest(calcGross, val, calcState);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Plant / Worker State</label>
            <select
              value={calcState}
              onChange={(e) => {
                const val = e.target.value;
                setCalcState(val);
                runSandboxTest(calcGross, calcBasic, val);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
            >
              <option value="Gujarat">Gujarat</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>
          </div>
        </div>

        {/* Live Calculation Output */}
        {previewResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">EPF Employee (12%)</span>
              <span className="text-lg font-black text-emerald-400">₹{previewResult.epf_employee}</span>
              <span className="text-[10px] text-slate-500 block">Employer: ₹{previewResult.epf_employer}</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">ESIC Employee (0.75%)</span>
              <span className="text-lg font-black text-blue-400">
                {previewResult.esic_employee > 0 ? `₹${previewResult.esic_employee}` : 'Exempt (> ₹21k)'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {previewResult.esic_employer > 0 ? `Employer: ₹${previewResult.esic_employer}` : 'Exempt'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Prof. Tax ({calcState})</span>
              <span className="text-lg font-black text-amber-400">₹{previewResult.professional_tax}</span>
              <span className="text-[10px] text-slate-500 block">State Slabs Applied</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated TDS</span>
              <span className="text-lg font-black text-rose-400">₹{previewResult.tds || 0}</span>
              <span className="text-[10px] text-slate-500 block">New Tax Regime</span>
            </div>
          </div>
        )}
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="font-bold text-slate-800 text-xs">Active Statutory Rules Table</div>
          <div className="text-xs text-slate-500 font-mono">2026-2027 Financial Year</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Rule Name & Code</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Jurisdiction</th>
                <th className="py-3 px-4">Wage Base</th>
                <th className="py-3 px-4">Rates (EE / ER)</th>
                <th className="py-3 px-4">Wage Ceiling</th>
                <th className="py-3 px-4">Review Required</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{r.rule_name}</div>
                    <div className="font-mono text-[10px] text-slate-500">{r.rule_code}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-brand-800">{r.statutory_component}</td>
                  <td className="py-3 px-4">{r.state}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{r.wage_base}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {r.employee_rate > 0 ? `${r.employee_rate}%` : '-'} /{' '}
                    {r.employer_rate > 0 ? `${r.employer_rate}%` : '-'}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-700">
                    {r.ceiling_limit ? `₹${r.ceiling_limit.toLocaleString('en-IN')}` : 'No Ceiling'}
                  </td>
                  <td className="py-3 px-4">
                    {r.requires_accountant_review ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Review Flagged
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Auto-Verified</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isRole('Super Admin', 'Accountant') && (
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="px-2.5 py-1 text-[11px] font-bold text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-lg transition"
                      >
                        Edit Rule
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Rule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? `Edit Statutory Rule (${editingRule.rule_code})` : 'Create New Statutory Rule'}
        subtitle="Maintain regulatory compliance with accurate ceiling limits and percentage rates"
      >
        <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Rule Name</label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Rule Code (Unique)</label>
              <input
                type="text"
                required
                value={ruleCode}
                onChange={(e) => setRuleCode(e.target.value.toUpperCase())}
                className="w-full p-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Component</label>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              >
                <option value="EPF">EPF (Provident Fund)</option>
                <option value="ESIC">ESIC (Employee State Insurance)</option>
                <option value="PT">PT (Professional Tax)</option>
                <option value="TDS">TDS (Income Tax)</option>
                <option value="LWF">LWF (Labour Welfare Fund)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">State Jurisdiction</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Employee Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={eeRate}
                onChange={(e) => setEeRate(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Employer Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={erRate}
                onChange={(e) => setErRate(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Statutory Ceiling Limit (₹)</label>
              <input
                type="number"
                value={ceiling}
                onChange={(e) => setCeiling(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Wage Base Definition</label>
              <input
                type="text"
                value={wageBase}
                onChange={(e) => setWageBase(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2 cursor-pointer bg-amber-50 p-3 rounded-xl border border-amber-200">
              <input
                type="checkbox"
                checked={reviewRequired}
                onChange={(e) => setReviewRequired(e.target.checked)}
                className="rounded text-brand-800"
              />
              <span className="font-bold text-amber-900">
                Flag uncertain statutory calculations for accountant review
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Save Statutory Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
