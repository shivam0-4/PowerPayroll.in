# GROUPON POWER
## Enterprise Labour Management, Attendance & Payroll Automation System

![Version](https://img.shields.io/badge/version-2.0.0-emerald.svg)
![Python](https://img.shields.io/badge/python-3.11%20%7C%203.14-blue.svg)
![React](https://img.shields.io/badge/react-18.3.1-cyan.svg)
![Tailwind](https://img.shields.io/badge/tailwind-3.4-teal.svg)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-blue.svg)

---

## 1. Executive Summary

**GROUPON POWER** is a production-grade Enterprise Workforce & Payroll ERP designed for manufacturing plants, infrastructure projects, and engineering establishments. It automates daily wage tracking, biometric attendance, overtime calculations, statutory deductions (EPF, ESIC, Professional Tax, TDS), employee loan/advance deductions, locked salary registers, payslip generation, and corporate bank transfer reconciliation.

### Supported Workforce Types:
- **Daily Wage Workers** (Basic = Daily rate × Payable days)
- **Monthly Salaried Staff** (Basic adjusted by calendar payable days)
- **Contract Labour & Temporary Workers**
- **Permanent Skilled, Semi-Skilled & Unskilled Workers**

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Python, Flask REST API, SQLAlchemy 2.0, Flask-JWT-Extended, Flask-CORS
- **Database**: PostgreSQL (Production) / SQLite with automatic zero-config fallback (Local Dev)
- **Architecture**: Clean Modular Monolith ready for microservice decoupling
- **Testing**: Pytest with automated unit and integration tests

---

## 3. Database Architecture (25 Normalized Tables)

1. `users` - Corporate logins with secure hashing and activity logs.
2. `roles` - System roles (`Super Admin`, `HR Manager`, `Accountant`, `Payroll Manager`, `Viewer`).
3. `permissions` - Granular CRUD and Approval permissions matrix.
4. `companies` - Corporate identity, logo, address, GSTIN, TAN, PAN, PF & ESIC employer codes.
5. `work_locations` - Manufacturing plants, construction sites, states.
6. `departments` - Operational divisions (Fabrication, Assembly, Civil, Maintenance, QA).
7. `employees` - Comprehensive master (personal, employment, wage, statutory flags, bank info).
8. `employee_documents` - Photo, Aadhaar, PAN, and contracts repository.
9. `salary_structures` - Configurable basic, DA, HRA, conveyance, allowances, bonus, OT rate.
10. `salary_components` - Master earnings and deduction component rules.
11. `attendance` - Daily shift records, clock times, working hours, overtime hours, statuses.
12. `attendance_approvals` - Monthly department muster roll approvals and freeze locks.
13. `leave_records` - Paid leave, sick leave, unpaid leave requests and approvals.
14. `overtime_records` - Overtime hour justifications and 2.0x multiplier approvals.
15. `advances` - Employee loan records, monthly EMI deductions, outstanding balances.
16. `advance_repayments` - Deductions audit trail linked to payroll records or direct cash receipts.
17. `payroll_periods` - Monthly cycles with status transitions (`Draft` -> `Calculated` -> `Approved` -> `Locked`).
18. `payroll_records` - Employee-level salary calculations and payable day breakdowns.
19. `payroll_earnings` - Detailed line-item earnings (Basic, DA, HRA, Overtime, Incentives).
20. `payroll_deductions` - Detailed line-item deductions (PF, ESIC, PT, TDS, Advances).
21. `payslips` - Locked salary slips with numbers, net amount in words, and verification.
22. `salary_payments` - Disbursal tracking (Pending, Processing, Paid, Failed) & bank statement reconciliation.
23. `statutory_rules` - Dynamic Indian payroll rules table (EPF, ESIC, State PT slabs, TDS).
24. `audit_logs` - Immutable audit log of all financial and employee modifications.
25. `notifications` - Operational alerts for approvals, attendance anomalies, and payments.

---

## 4. Pre-Configured Demo Credentials

The database comes pre-seeded with 5 enterprise roles and realistic employees across all wage models:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@grouponpower.com` | `Admin@123` | Full system control, role permissions, payroll locking |
| **HR Manager** | `hr@grouponpower.com` | `Hr@123` | Workforce master, muster roll attendance, approvals |
| **Chief Accountant** | `accounts@grouponpower.com` | `Accounts@123` | Statutory rules, payroll approval, bank payment reconciliation |
| **Payroll Manager** | `payroll@grouponpower.com` | `Payroll@123` | Wage structures, advance approvals, payroll calculation engine |
| **Viewer / Auditor** | `viewer@grouponpower.com` | `Viewer@123` | Read-only view with masked employee bank and identity data |

---

## 5. Quick Start & Installation

### Option A: Local Development (Fastest Zero-Setup)

#### 1. Backend Setup:
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run seed script to initialize database with enterprise demo records
python app/seed.py

# Start Flask API server (runs on port 5000)
python run.py
```

#### 2. Frontend Setup:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies with pnpm
pnpm install

# Start Vite dev server (runs on http://localhost:3000)
pnpm run dev
```

### Option B: Docker Compose (Full Production Stack)

```bash
docker-compose up --build
```
This launches:
- `postgres` (PostgreSQL 15 on port 5432)
- `redis` (Redis 7 on port 6379)
- `backend` (Flask REST API on port 5000)
- `frontend` (Nginx + React Vite on port 80)

---

## 6. Running Automated Tests

Run the full Pytest test suite covering authentication, employee records, attendance calculations, statutory deductions, payroll engine, advance recoveries, and locking edge cases:

```bash
# Set PYTHONPATH to include backend and run pytest
$env:PYTHONPATH='backend'; python -m pytest backend/tests
```

---

## 7. Statutory Compliance Engine (Indian Payroll)

The statutory engine dynamically evaluates:
1. **Employees Provident Fund (EPF)**:
   - 12% Employee Contribution on Basic + DA (statutory ceiling: ₹15,000/month).
   - 12% Employer Contribution (3.67% EPF + 8.33% EPS capped at ₹15,000).
2. **Employees State Insurance (ESIC)**:
   - 0.75% Employee Contribution on gross wages if gross <= ₹21,000/month.
   - 3.25% Employer Contribution.
   - Automatic exemption if monthly gross wages exceed ₹21,000.
3. **State Professional Tax (PT)**:
   - Dynamic progressive slabs (Gujarat: ₹0 under 6k, ₹80 for 6-9k, ₹150 for 9-12k, ₹200 for 12k+).
   - Maharashtra slabs supported with configurable accountant review flags.
4. **Income Tax (TDS)**:
   - Projected annual tax estimation under the New Tax Regime.

---

## 8. License & Confidentiality

**GROUPON POWER INFRA & LABOUR LTD** - All Rights Reserved © 2026.
