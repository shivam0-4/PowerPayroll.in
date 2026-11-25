import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      showToast('Welcome back to GROUPON POWER ERP', 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-800 border-2 border-gold-500 shadow-xl mb-4">
            <span className="text-gold-400 font-black text-2xl tracking-wider">GP</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            GROUPON <span className="text-gold-400">POWER</span>
          </h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-brand-300 mt-1">
            Enterprise Labour & Payroll Automation ERP
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800">Secure Sign In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your corporate credentials to access the system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@grouponpower.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Quick Role Switcher (Pre-configured)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@grouponpower.com', 'Admin@123')}
                className="p-2 text-left bg-slate-50 hover:bg-brand-50 hover:border-brand-200 border border-slate-200 rounded-xl transition"
              >
                <div className="font-bold text-slate-800">Super Admin</div>
                <div className="text-[10px] text-slate-500">Full System Access</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('hr@grouponpower.com', 'Hr@123')}
                className="p-2 text-left bg-slate-50 hover:bg-brand-50 hover:border-brand-200 border border-slate-200 rounded-xl transition"
              >
                <div className="font-bold text-slate-800">HR Manager</div>
                <div className="text-[10px] text-slate-500">Employees & Attendance</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('accounts@grouponpower.com', 'Accounts@123')}
                className="p-2 text-left bg-slate-50 hover:bg-brand-50 hover:border-brand-200 border border-slate-200 rounded-xl transition"
              >
                <div className="font-bold text-slate-800">Accountant</div>
                <div className="text-[10px] text-slate-500">Approvals & Payments</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('payroll@grouponpower.com', 'Payroll@123')}
                className="p-2 text-left bg-slate-50 hover:bg-brand-50 hover:border-brand-200 border border-slate-200 rounded-xl transition"
              >
                <div className="font-bold text-slate-800">Payroll Exec</div>
                <div className="text-[10px] text-slate-500">Calculation Engine</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-xs text-brand-300/70 flex items-center justify-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-gold-400" />
          <span>AES-256 Encrypted Session & JWT Authentication</span>
        </div>
      </div>
    </div>
  );
};
