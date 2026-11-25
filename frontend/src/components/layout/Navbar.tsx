import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell, Shield, User as UserIcon, Building } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-brand-800 text-gold-400 flex items-center justify-center font-black text-lg shadow-sm border border-brand-700">
            GP
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-brand-900 block leading-tight">
              GROUPON <span className="text-gold-600">POWER</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block -mt-0.5">
              Labour ERP & Payroll Automation
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Role indicator pill */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>{user?.role || 'Viewer'}</span>
        </div>

        {/* User profile dropdown / logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user?.full_name}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {user?.email}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
