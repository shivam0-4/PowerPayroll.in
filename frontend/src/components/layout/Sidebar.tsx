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
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  onNavigate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileMenuOpen, onNavigate }) => {
  const { isRole } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Employees Master', path: '/employees', icon: Users },
    { label: 'Upload CV', path: '/cv-upload', icon: Upload },
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
    <>
      <button
        type="button"
        tabIndex={isMobileMenuOpen ? 0 : -1}
        aria-hidden={!isMobileMenuOpen}
        aria-label="Close navigation menu"
        onClick={onNavigate}
        className={`fixed inset-x-0 bottom-0 top-16 z-20 bg-black/40 transition-opacity lg:hidden ${
          isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        id="primary-navigation"
        className={`fixed bottom-0 left-0 top-16 z-20 flex w-72 max-w-[85vw] flex-col border-r border-brand-800 bg-brand-900 transition-transform duration-200 lg:visible lg:static lg:z-auto lg:min-h-[calc(100vh-4rem)] lg:w-64 lg:max-w-none lg:translate-x-0 lg:border-r ${
          isMobileMenuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
      <div className="flex flex-1 flex-col overflow-y-auto p-2 lg:space-y-1 lg:p-4 lg:py-6">
        <div className="hidden px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-brand-400 lg:block">
          Core Operations
        </div>
        {navItems.map((item) => {
          if (item.adminOnly && !isRole('Super Admin')) return null;
          if (
            item.path === '/cv-upload' &&
            !['Super Admin', 'HR Manager', 'Payroll Manager'].some((role) => isRole(role))
          ) return null;

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex flex-shrink-0 items-center space-x-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all lg:space-x-3 lg:px-3.5 lg:py-2.5 lg:text-xs ${
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
      <div className="hidden p-4 border-t border-brand-800 text-[11px] text-brand-400 lg:block">
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
    </>
  );
};
