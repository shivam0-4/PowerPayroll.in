export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  role_id?: number;
  is_active?: boolean;
  permissions?: Permission[];
  last_login_at?: string;
}

export interface Permission {
  id: number;
  module: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

export interface Company {
  id: number;
  name: string;
  logo_url?: string;
  registered_address?: string;
  gst_no?: string;
  pan_no?: string;
  tan_no?: string;
  pf_establishment_code?: string;
  esic_employer_code?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  contact_email?: string;
  contact_phone?: string;
  financial_year?: string;
  default_overtime_multiplier?: number;
  daily_working_hours?: number;
  locations_count?: number;
  departments_count?: number;
}

export interface Department {
  id: number;
  company_id: number;
  department_name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export interface WorkLocation {
  id: number;
  company_id: number;
  location_name: string;
  code: string;
  address?: string;
  city?: string;
  state: string;
  is_active: boolean;
}

export interface Employee {
  id: number;
  emp_code: string;
  full_name: string;
  father_name?: string;
  dob?: string;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  designation: string;
  department_id?: number;
  department_name?: string;
  location_id?: number;
  location_name?: string;
  employment_category: string;
  employment_type: string;
  join_date: string;
  exit_date?: string;
  supervisor_name?: string;
  status: string;
  is_active: boolean;
  wage_type: 'daily_wage' | 'monthly_salary';
  daily_wage_rate?: number;
  monthly_salary?: number;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  uan?: string;
  esic_ip_number?: string;
  pan?: string;
  pf_applicable: boolean;
  esic_applicable: boolean;
  pt_applicable: boolean;
  tds_applicable: boolean;
  salary_structure?: SalaryStructure;
  documents?: EmployeeDocument[];
}

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  doc_type: string;
  doc_name: string;
  file_path: string;
  file_size_bytes: number;
  uploaded_at: string;
}

export interface SalaryStructure {
  id?: number;
  employee_id?: number;
  basic_pay: number;
  da: number;
  hra: number;
  conveyance: number;
  special_allowance: number;
  other_allowances: number;
  incentive: number;
  production_bonus: number;
  overtime_rate_per_hour: number;
  total_fixed_earnings?: number;
  is_active?: boolean;
}

export interface AttendanceRecord {
  employee_id: number;
  emp_code: string;
  full_name: string;
  department_name?: string;
  designation: string;
  wage_type: string;
  status: 'Present' | 'Absent' | 'Half Day' | 'Weekly Off' | 'Paid Leave' | 'Unpaid Leave' | 'Holiday' | 'Overtime';
  check_in?: string;
  check_out?: string;
  working_hours: number;
  overtime_hours: number;
  shift: string;
  remarks?: string;
  is_locked: boolean;
}

export interface Advance {
  id: number;
  employee_id: number;
  employee_name?: string;
  emp_code?: string;
  department_name?: string;
  request_date: string;
  amount: number;
  monthly_installment: number;
  remaining_amount: number;
  reason?: string;
  payment_mode: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Settled';
  approved_at?: string;
  notes?: string;
}

export interface PayrollPeriod {
  id: number;
  month: number;
  year: number;
  period_label: string;
  start_date: string;
  end_date: string;
  total_working_days: number;
  status: 'Draft' | 'Calculated' | 'Pending Approval' | 'Approved' | 'Locked';
  processed_at?: string;
  approved_at?: string;
  locked_at?: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  notes?: string;
}

export interface PayrollRecord {
  id: number;
  period_id: number;
  period_month?: number;
  period_year?: number;
  employee_id: number;
  employee_name?: string;
  emp_code?: string;
  department_name?: string;
  wage_type: string;
  base_rate: number;
  payable_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  paid_leaves: number;
  overtime_hours: number;
  overtime_amount: number;
  gross_earnings: number;
  total_deductions: number;
  net_salary: number;
  status: string;
  review_flag: boolean;
  review_notes?: string;
  earnings: { id?: number; component_name: string; amount: number }[];
  deductions: { id?: number; deduction_name: string; amount: number; is_statutory?: boolean }[];
  payment_status: 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Partially Paid';
  payslip_number?: string;
}

export interface PayslipDetail {
  id: number;
  payslip_number: string;
  salary_month: string;
  month_name: string;
  company: {
    name: string;
    address: string;
    gst_no: string;
    pan_no: string;
    pf_establishment_code: string;
    esic_employer_code: string;
    logo_url?: string;
  };
  employee: {
    id: number;
    emp_code: string;
    full_name: string;
    department: string;
    designation: string;
    employment_category: string;
    wage_type: string;
    join_date?: string;
    bank_name?: string;
    bank_account_masked: string;
    bank_ifsc?: string;
    uan: string;
    esic_ip_number: string;
    pan_masked: string;
  };
  attendance: {
    total_working_days: number;
    present_days: number;
    half_days: number;
    absent_days: number;
    paid_leaves: number;
    unpaid_leaves: number;
    payable_days: number;
    overtime_hours: number;
  };
  earnings: { component_name: string; amount: number }[];
  deductions: { deduction_name: string; amount: number; is_statutory?: boolean }[];
  gross_earnings: number;
  total_deductions: number;
  net_salary: number;
  net_salary_words: string;
  payment_status: string;
  payment_date?: string;
  transaction_ref?: string;
}

export interface SalaryPayment {
  id: number;
  payment_id?: number;
  payroll_record_id: number;
  employee_id?: number;
  employee_name?: string;
  emp_code?: string;
  department?: string;
  designation?: string;
  wage_type?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_name?: string;
  period_id?: number;
  period_label?: string;
  salary_month?: string;
  payment_mode: string;
  transaction_ref?: string;
  payment_date?: string;
  amount: number;
  gross_salary?: number;
  total_deductions?: number;
  net_payable?: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAYMENT_PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | string;
  idempotency_key?: string;
  reconciled_at?: string;
  bank_statement_ref?: string;
  notes?: string;
  transactions_count?: number;
}

export interface PaymentTransaction {
  id: number;
  salary_payment_id: number;
  transaction_ref: string;
  idempotency_key?: string;
  amount: number;
  payment_mode: string;
  status: 'PAID' | 'PAYMENT_PROCESSING' | 'FAILED' | 'REFUNDED' | string;
  provider: string;
  provider_tx_id?: string;
  failure_reason?: string;
  initiated_by?: string;
  initiated_at?: string;
  confirmed_at?: string;
  notes?: string;
  employee_name?: string;
  emp_code?: string;
  department?: string;
  period_label?: string;
  salary_month?: string;
  gross_salary?: number;
  total_deductions?: number;
  net_payable?: number;
  remaining_amount?: number;
}

export interface PendingPaymentSummary {
  total_pending_amount: number;
  pending_employees_count: number;
  fully_paid_count: number;
  partially_paid_count: number;
  overdue_count: number;
  total_paid_this_month: number;
  total_records: number;
  gateway_info: {
    mode: string;
    is_sandbox: boolean;
    provider_label: string;
    single_payout_limit: number;
  };
}

export interface BulkPaymentResultItem {
  payment_id: number;
  employee_name: string;
  emp_code: string;
  amount: number;
  remaining_amount?: number;
  status: 'PAID' | 'PAYMENT_PROCESSING' | 'FAILED' | string;
  transaction_ref?: string;
  failure_reason?: string;
}

export interface BulkPaymentResponse {
  total_requested: number;
  successful_count: number;
  failed_count: number;
  processing_count: number;
  total_settled_amount: number;
  results: BulkPaymentResultItem[];
  gateway_info?: any;
}

export interface PaymentReceiptData {
  receipt_number: string;
  transaction_id: number;
  transaction_ref: string;
  provider_tx_id?: string;
  amount: number;
  amount_in_words: string;
  payment_mode: string;
  status: string;
  payment_date: string;
  company: {
    name: string;
    address: string;
    gst_no: string;
    pan_no: string;
    pf_code: string;
    esic_code: string;
  };
  employee: {
    id?: number;
    emp_code: string;
    full_name: string;
    department: string;
    designation: string;
    bank_name: string;
    bank_account_masked: string;
    bank_ifsc: string;
  };
  payroll_details: {
    period_label: string;
    salary_month: string;
    net_payable_salary: number;
    total_paid_so_far: number;
    remaining_balance: number;
  };
  settled_by: string;
}

export interface StatutoryRule {
  id: number;
  rule_name: string;
  rule_code: string;
  statutory_component: string;
  state: string;
  wage_base: string;
  employee_rate: number;
  employer_rate: number;
  ceiling_limit?: number;
  exemption_limit: number;
  slab_configuration?: any[];
  applicable_category: string;
  source_reference?: string;
  approval_status: string;
  requires_accountant_review: boolean;
  is_active: boolean;
}

export interface DashboardData {
  kpis: {
    total_employees: number;
    active_employees: number;
    present_today: number;
    absent_today: number;
    monthly_gross: number;
    monthly_deductions: number;
    monthly_net: number;
    latest_period_label: string;
    latest_period_status: string;
    pending_advances: number;
    pending_payments_total: number;
    pending_payments_count: number;
    pending_summary?: PendingPaymentSummary;
  };
  monthly_trends: { period: string; gross: number; deductions: number; net: number; employees: number }[];
  department_costs: { department: string; cost: number; employees: number }[];
  category_distribution: { name: string; value: number }[];
  attendance_trends: { date: string; present: number; absent: number; ot_hours: number }[];
  alerts: { id: number; type: 'info' | 'warning' | 'danger'; title: string; message: string }[];
}
