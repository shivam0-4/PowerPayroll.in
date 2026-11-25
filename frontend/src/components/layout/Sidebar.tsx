import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Sliders,
  HandCoins,
  Calculator,
  Receipt,
  CreditCard,
  Scale,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { isRole } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Employees Master', path: '/employees', icon: Users },
    { label: 'Daily Attendance', path: '/attendance', icon: CalendarCheck },
    { label: 'Wage Structures', path: '/wages', icon: Sliders },
    { label: 'Advances & Loans', path: '/advances', icon: HandCoins },
    { label: 'Payroll Engine', path: '/payroll', icon: Calculator },
    { label: 'Payslips', path: '/payslips', icon: Receipt },
    { label: 'Payments & Reconcile', path: '/payments', icon: CreditCard },
    { label: 'Statutory Compliance', path: '/statutory', icon: Scale },
    { label: 'Reports & Exports', path: '/reports', icon: FileSpreadsheet },
    { label: 'Company Setup', path: '/company', icon: Building2 },
    { label: 'Users & RBAC', path: '/users', icon: ShieldCheck, adminOnly: true },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-brand-900 border-r border-brand-800 flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 py-6 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-brand-400">
          Core Operations
        </div>
        {navItems.map((item) => {
          if (item.adminOnly && !isRole('Super Admin')) return null;

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-800 text-gold-400 shadow-sm border border-brand-700'
                    : 'text-brand-200 hover:bg-brand-800/60 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-brand-800 text-[11px] text-brand-400">
        <div className="flex items-center justify-between">
          <span>Enterprise v2.0</span>
          <span className="flex items-center space-x-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </span>
        </div>
        <div className="text-[10px] text-brand-400/80 mt-1">
          Indian Labour Code & PF Compliant
        </div>
      </div>
    </aside>
  );
};
