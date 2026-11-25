import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { AttendancePage } from './pages/Attendance';
import { WageStructures } from './pages/WageStructures';
import { Advances } from './pages/Advances';
import { Payroll } from './pages/Payroll';
import { Payslips } from './pages/Payslips';
import { Payments } from './pages/Payments';
import { Statutory } from './pages/Statutory';
import { Reports } from './pages/Reports';
import { CompanySettings } from './pages/CompanySettings';
import { UsersPage } from './pages/Users';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="wages" element={<WageStructures />} />
              <Route path="advances" element={<Advances />} />
              <Route path="payroll" element={<Payroll />} />
              <Route path="payslips" element={<Payslips />} />
              <Route path="payments" element={<Payments />} />
              <Route path="statutory" element={<Statutory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="company" element={<CompanySettings />} />
              <Route path="users" element={<UsersPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
