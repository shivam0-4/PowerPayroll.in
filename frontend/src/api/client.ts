const API_BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('groupon_token');
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('groupon_token');
    localStorage.removeItem('groupon_user');
    window.location.href = '/login';
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data.error || data.message || 'An error occurred', response.status, data);
    }
    return data;
  } else {
    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(text || 'An error occurred', response.status);
    }
    return response as any;
  }
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ access_token: string; refresh_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<{ user: any }>('/auth/me'),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  // Users & RBAC
  getUsers: () => request<{ users: any[] }>('/users'),
  createUser: (data: any) => request<{ message: string; user: any }>('/users', { method: 'POST', body: JSON.stringify(data) }),
  toggleUserStatus: (userId: number) => request<{ message: string; user: any }>(`/users/${userId}/toggle-status`, { method: 'PUT' }),
  getRoles: () => request<{ roles: any[] }>('/users/roles'),
  getAuditLogs: (page = 1) => request<{ logs: any[]; total: number; pages: number }>(`/users/audit-logs?page=${page}`),

  // Company
  getCompany: () => request<{ company: any }>('/company'),
  updateCompany: (data: any) => request<{ message: string; company: any }>('/company', { method: 'PUT', body: JSON.stringify(data) }),
  getDepartments: () => request<{ departments: any[] }>('/company/departments'),
  createDepartment: (data: any) => request<{ department: any }>('/company/departments', { method: 'POST', body: JSON.stringify(data) }),
  getLocations: () => request<{ locations: any[] }>('/company/locations'),
  createLocation: (data: any) => request<{ location: any }>('/company/locations', { method: 'POST', body: JSON.stringify(data) }),

  // Employees
  getEmployees: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ employees: any[]; total: number }>(`/employees${qs}`);
  },
  getEmployee: (id: number) => request<{ employee: any }>(`/employees/${id}`),
  createEmployee: (data: any) => request<{ message: string; employee: any }>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: any) => request<{ message: string; employee: any }>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadEmployeeCv: (id: number, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<{ message: string; document: any }>(`/employees/${id}/cv`, { method: 'POST', body });
  },
  downloadEmployeeDocument: async (id: number, filename: string) => {
    const response = await request<Response>(`/employees/documents/${id}/download`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  toggleEmployeeStatus: (id: number) => request<{ message: string; employee: any }>(`/employees/${id}/toggle-status`, { method: 'PUT' }),
  bulkImportEmployees: (rows: any[]) => request<{ message: string; imported: number; errors: string[] }>('/employees/bulk-import', { method: 'POST', body: JSON.stringify({ rows }) }),

  // Attendance
  getDailyAttendance: (date: string, departmentId?: number, locationId?: number) => {
    let url = `/attendance?date=${date}`;
    if (departmentId) url += `&department_id=${departmentId}`;
    if (locationId) url += `&location_id=${locationId}`;
    return request<{ date: string; records: any[]; summary: any }>(url);
  },
  markAttendance: (data: any) => request<{ message: string; attendance: any }>('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  bulkMarkAttendance: (records: any[]) => request<{ message: string }>('/attendance/bulk', { method: 'POST', body: JSON.stringify({ records }) }),
  getMonthlyAttendanceSummary: (month: number, year: number, departmentId?: number) => {
    let url = `/attendance/monthly-summary?month=${month}&year=${year}`;
    if (departmentId) url += `&department_id=${departmentId}`;
    return request<{ month: number; year: number; days_in_month: number; records: any[]; is_approved: boolean }>(url);
  },
  approveAttendance: (data: { month: number; year: number; department_id?: number; notes?: string }) =>
    request<{ message: string; approval: any }>('/attendance/approve', { method: 'POST', body: JSON.stringify(data) }),

  // Advances & Loans
  getAdvances: (status?: string, empId?: number) => {
    let url = '/advances?';
    if (status) url += `status=${status}&`;
    if (empId) url += `employee_id=${empId}&`;
    return request<{ advances: any[]; total_outstanding: number }>(url);
  },
  issueAdvance: (data: any) => request<{ message: string; advance: any }>('/advances', { method: 'POST', body: JSON.stringify(data) }),
  repayAdvance: (advanceId: number, data: { amount: number; payment_mode?: string; notes?: string }) =>
    request<{ message: string; repayment: any }>(`/advances/${advanceId}/repay`, { method: 'POST', body: JSON.stringify(data) }),
  getAdvanceHistory: (advanceId: number) => request<{ advance: any; repayments: any[] }>(`/advances/${advanceId}/history`),

  // Statutory Compliance
  getStatutoryRules: (component?: string, state?: string) => {
    let url = '/statutory/rules?';
    if (component) url += `component=${component}&`;
    if (state) url += `state=${state}&`;
    return request<{ rules: any[] }>(url);
  },
  createStatutoryRule: (data: any) => request<{ message: string; rule: any }>('/statutory/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateStatutoryRule: (id: number, data: any) => request<{ message: string; rule: any }>(`/statutory/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  previewStatutoryCalculation: (data: any) => request<{ preview: any }>('/statutory/preview-calculation', { method: 'POST', body: JSON.stringify(data) }),

  // Payroll Engine
  getPayrollPeriods: (year?: number) => request<{ periods: any[] }>(`/payroll${year ? `?year=${year}` : ''}`),
  generatePayrollPeriod: (data: { month: number; year: number; working_days?: number }) =>
    request<{ message: string; period: any }>('/payroll/generate', { method: 'POST', body: JSON.stringify(data) }),
  getPayrollPeriodDetails: (periodId: number, departmentId?: number, wageType?: string) => {
    let url = `/payroll/${periodId}?`;
    if (departmentId) url += `department_id=${departmentId}&`;
    if (wageType) url += `wage_type=${wageType}&`;
    return request<{ period: any; records: any[]; total_records: number }>(url);
  },
  calculatePayroll: (periodId: number) => request<{ message: string; period: any }>(`/payroll/${periodId}/calculate`, { method: 'POST' }),
  approvePayroll: (periodId: number) => request<{ message: string; period: any }>(`/payroll/${periodId}/approve`, { method: 'POST' }),
  lockPayroll: (periodId: number) => request<{ message: string; period: any }>(`/payroll/${periodId}/lock`, { method: 'POST' }),
  getPayrollRecordDetails: (recordId: number) => request<{ record: any }>(`/payroll/records/${recordId}`),

  // Payslips
  getPayslip: (payslipId: number) => request<{ payslip: any }>(`/payslips/${payslipId}`),
  getEmployeePayslips: (empId: number) => request<{ payslips: any[] }>(`/payslips/employee/${empId}`),

  // Payments & Reconciliation
  getPayments: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ payments: any[]; summary: any }>(`/payments${qs}`);
  },
  getPendingPayments: (periodId?: number) => {
    const qs = periodId ? `?period_id=${periodId}` : '';
    return request<{ pending_payments: any[]; count: number; total_pending_amount: number }>(`/payments/pending${qs}`);
  },
  getPaymentSummary: () => request<{ summary: any }>('/payments/summary'),
  bulkInitiatePayments: (data: { payment_ids: number[]; payment_mode?: string; idempotency_prefix?: string }) =>
    request<any>('/payments/bulk-initiate', { method: 'POST', body: JSON.stringify(data) }),
  initiateSinglePayment: (paymentId: number, data: { amount?: number; payment_mode?: string; idempotency_key?: string; notes?: string }) =>
    request<any>(`/payments/${paymentId}/initiate`, { method: 'POST', body: JSON.stringify(data) }),
  getPaymentHistory: (params?: Record<string, any>) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') cleanParams[k] = String(v);
      });
    }
    const qs = Object.keys(cleanParams).length > 0 ? '?' + new URLSearchParams(cleanParams).toString() : '';
    return request<{ history: any[]; total: number }>(`/payments/history${qs}`);
  },
  getPaymentStatus: (paymentId: number) => request<any>(`/payments/${paymentId}/status`),
  getPaymentReceipt: (transactionId: number) => request<{ receipt: any }>(`/payments/receipt/${transactionId}`),
  getPaymentReconciliation: (periodId?: number) => {
    const qs = periodId ? `?period_id=${periodId}` : '';
    return request<{ reconciliation: any }>(`/payments/reconciliation${qs}`);
  },
  updatePayment: (id: number, data: any) => request<{ message: string; payment: any }>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reconcilePaymentsBatch: (data: { payment_ids: number[]; transaction_prefix?: string; payment_mode?: string; bank_statement_ref?: string }) =>
    request<{ message: string }>('/payments/reconcile-batch', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getSalaryRegister: (periodId: number) => request<any>(`/reports/salary-register/${periodId}`),

  // Dashboard & Analytics
  getDashboardAnalytics: () => request<any>('/dashboard/analytics'),
};
