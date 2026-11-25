import json
from datetime import date, timedelta
from app import create_app
from app.database import db
from app.models.user import Role, Permission, User
from app.models.company import Company, WorkLocation, Department
from app.models.statutory import StatutoryRule
from app.models.employee import Employee, SalaryStructure, SalaryComponent
from app.models.attendance import Attendance
from app.models.advance import Advance
from app.services.payroll_engine import PayrollEngine

def seed_database():
    app = create_app()
    with app.app_context():
        print("Creating all database tables...")
        db.create_all()

        # 1. Roles & Permissions
        role_names = ['Super Admin', 'HR Manager', 'Accountant', 'Payroll Manager', 'Viewer']
        roles = {}
        for rname in role_names:
            role = Role.query.filter_by(name=rname).first()
            if not role:
                role = Role(
                    name=rname,
                    description=f"{rname} role for GROUPON POWER",
                    is_system=True
                )
                db.session.add(role)
                db.session.flush()
            roles[rname] = role

        # Seed Permissions
        modules = ['employees', 'attendance', 'payroll', 'advances', 'payments', 'statutory', 'company']
        for rname, role_obj in roles.items():
            for mod in modules:
                perm = Permission.query.filter_by(role_id=role_obj.id, module=mod).first()
                if not perm:
                    if rname == 'Super Admin':
                        perm = Permission(role_id=role_obj.id, module=mod, can_create=True, can_read=True, can_update=True, can_delete=True, can_approve=True)
                    elif rname == 'HR Manager':
                        perm = Permission(role_id=role_obj.id, module=mod, can_create=True, can_read=True, can_update=True, can_delete=(mod not in ['payroll', 'statutory']), can_approve=(mod in ['attendance', 'employees']))
                    elif rname == 'Accountant':
                        perm = Permission(role_id=role_obj.id, module=mod, can_create=True, can_read=True, can_update=True, can_delete=False, can_approve=(mod in ['payroll', 'payments', 'advances', 'statutory']))
                    elif rname == 'Payroll Manager':
                        perm = Permission(role_id=role_obj.id, module=mod, can_create=True, can_read=True, can_update=True, can_delete=False, can_approve=(mod in ['payroll', 'advances']))
                    elif rname == 'Viewer':
                        perm = Permission(role_id=role_obj.id, module=mod, can_create=False, can_read=True, can_update=False, can_delete=False, can_approve=False)
                    db.session.add(perm)

        # 2. Users
        users_data = [
            ('admin@grouponpower.com', 'Admin@123', 'Vikram Patel (Super Admin)', 'Super Admin', '9876543210'),
            ('hr@grouponpower.com', 'Hr@123', 'Ananya Sharma (HR Head)', 'HR Manager', '9876543211'),
            ('accounts@grouponpower.com', 'Accounts@123', 'Rajesh Joshi (Chief Accountant)', 'Accountant', '9876543212'),
            ('payroll@grouponpower.com', 'Payroll@123', 'Deepak Verma (Payroll Executive)', 'Payroll Manager', '9876543213'),
            ('viewer@grouponpower.com', 'Viewer@123', 'Sneha Rao (Auditor / Viewer)', 'Viewer', '9876543214'),
        ]

        for email, pwd, fname, rname, phone in users_data:
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(
                    email=email,
                    full_name=fname,
                    role_id=roles[rname].id,
                    phone=phone,
                    is_active=True
                )
                user.set_password(pwd)
                db.session.add(user)

        # 3. Company & Locations & Departments
        comp = Company.query.first()
        if not comp:
            comp = Company(
                name="GROUPON POWER INFRA & LABOUR LTD",
                logo_url="/logo.png",
                registered_address="Plot No. 42-45, Phase 2, GIDC Industrial Estate, Sanand, Ahmedabad, Gujarat - 382110",
                gst_no="24AABCG1234F1Z5",
                pan_no="AABCG1234F",
                tan_no="AHMD01234E",
                pf_establishment_code="GJ/AHD/0045892/000",
                esic_employer_code="37000458920001001",
                bank_name="State Bank of India",
                bank_account_no="40982348921",
                bank_ifsc="SBIN0001234",
                bank_branch="Sanand Industrial Branch",
                contact_email="payroll@grouponpower.com",
                contact_phone="+91 79 4892 0000",
                financial_year="2026-2027",
                default_overtime_multiplier=2.0,
                daily_working_hours=8.0
            )
            db.session.add(comp)
            db.session.flush()

        locations_data = [
            ("Sanand Plant 1", "SND-1", "Phase 2 GIDC, Sanand", "Ahmedabad", "Gujarat"),
            ("Dahej Petrochem Facility", "DHJ", "PCPIR Zone, Dahej", "Bharuch", "Gujarat"),
            ("Chakan Assembly Works", "CKN", "Phase 3 MIDC, Chakan", "Pune", "Maharashtra"),
        ]
        locations = {}
        for lname, code, addr, city, st in locations_data:
            loc = WorkLocation.query.filter_by(code=code).first()
            if not loc:
                loc = WorkLocation(
                    company_id=comp.id,
                    location_name=lname,
                    code=code,
                    address=addr,
                    city=city,
                    state=st,
                    is_active=True
                )
                db.session.add(loc)
                db.session.flush()
            locations[code] = loc

        departments_data = [
            ("Fabrication & Welding", "FAB", "Heavy structural steel fabrication"),
            ("Assembly Line", "ASM", "Unit assembly and fitment"),
            ("Civil & Construction", "CIV", "Site infrastructure development"),
            ("Electrical & Maintenance", "ELE", "High voltage transformers & cabling"),
            ("Quality Assurance", "QA", "NDT testing and material certification"),
            ("Plant Operations", "OPS", "Floor administration and dispatch"),
        ]
        departments = {}
        for dname, code, desc in departments_data:
            dept = Department.query.filter_by(code=code).first()
            if not dept:
                dept = Department(
                    company_id=comp.id,
                    department_name=dname,
                    code=code,
                    description=desc,
                    is_active=True
                )
                db.session.add(dept)
                db.session.flush()
            departments[code] = dept

        # 4. Statutory Rules (Configurable Indian Payroll Engine)
        gujarat_pt_slabs = [
            {"min": 0, "max": 5999, "tax": 0},
            {"min": 6000, "max": 8999, "tax": 80},
            {"min": 9000, "max": 11999, "tax": 150},
            {"min": 12000, "max": None, "tax": 200}
        ]
        maharashtra_pt_slabs = [
            {"min": 0, "max": 7500, "tax": 0},
            {"min": 7501, "max": 10000, "tax": 175},
            {"min": 10001, "max": None, "tax": 200}
        ]

        stat_rules = [
            StatutoryRule(
                rule_name="EPF Employee Contribution",
                rule_code="EPF_EE",
                statutory_component="EPF",
                state="All India",
                wage_base="Basic + DA",
                employee_rate=12.0,
                employer_rate=0.0,
                ceiling_limit=15000.0,
                source_reference="Employees Provident Funds & Miscellaneous Provisions Act 1952",
                is_active=True
            ),
            StatutoryRule(
                rule_name="EPF Employer Contribution",
                rule_code="EPF_ER",
                statutory_component="EPF",
                state="All India",
                wage_base="Basic + DA",
                employee_rate=0.0,
                employer_rate=12.0, # 3.67% EPF + 8.33% EPS
                ceiling_limit=15000.0,
                source_reference="EPFO Notification",
                is_active=True
            ),
            StatutoryRule(
                rule_name="ESIC Employee Contribution",
                rule_code="ESIC_EE",
                statutory_component="ESIC",
                state="All India",
                wage_base="Gross Wages",
                employee_rate=0.75,
                employer_rate=0.0,
                ceiling_limit=21000.0,
                source_reference="Employees State Insurance Act 1948",
                is_active=True
            ),
            StatutoryRule(
                rule_name="ESIC Employer Contribution",
                rule_code="ESIC_ER",
                statutory_component="ESIC",
                state="All India",
                wage_base="Gross Wages",
                employee_rate=0.0,
                employer_rate=3.25,
                ceiling_limit=21000.0,
                source_reference="ESIC Ministry of Labour",
                is_active=True
            ),
            StatutoryRule(
                rule_name="Professional Tax - Gujarat",
                rule_code="PT_GUJ",
                statutory_component="PT",
                state="Gujarat",
                wage_base="Gross Wages",
                slab_configuration=json.dumps(gujarat_pt_slabs),
                source_reference="Gujarat State Tax on Professions Act",
                is_active=True
            ),
            StatutoryRule(
                rule_name="Professional Tax - Maharashtra",
                rule_code="PT_MAH",
                statutory_component="PT",
                state="Maharashtra",
                wage_base="Gross Wages",
                slab_configuration=json.dumps(maharashtra_pt_slabs),
                source_reference="Maharashtra State Tax on Professions Act",
                is_active=True
            ),
        ]
        for sr in stat_rules:
            if not StatutoryRule.query.filter_by(rule_code=sr.rule_code, state=sr.state).first():
                db.session.add(sr)

        # 5. Employees & Wage Structures (Covering all prompt workforce requirements)
        employees_seed_data = [
            # Daily Wage Workers (Skilled, Semi-skilled, Unskilled)
            {
                'emp_code': 'GP-0001',
                'full_name': 'Ramesh Bhai Solanki',
                'father_name': 'Govind Bhai Solanki',
                'designation': 'Senior Welder (6G Certified)',
                'department_code': 'FAB',
                'location_code': 'SND-1',
                'employment_category': 'Skilled Worker',
                'employment_type': 'Full-Time',
                'wage_type': 'daily_wage',
                'daily_wage_rate': 750.0,
                'monthly_salary': 0.0,
                'phone': '9825011001',
                'bank_account_no': '918237461928',
                'bank_ifsc': 'SBIN0001234',
                'bank_name': 'State Bank of India',
                'uan': '101293847581',
                'esic_ip_number': '3718293847',
                'pan': 'BRKPS1928A',
                'pf_applicable': True,
                'esic_applicable': True,
                'pt_applicable': True,
                'gender': 'Male'
            },
            {
                'emp_code': 'GP-0002',
                'full_name': 'Mahesh Kumar Varma',
                'father_name': 'Santosh Varma',
                'designation': 'Structural Fitter',
                'department_code': 'FAB',
                'location_code': 'SND-1',
                'employment_category': 'Semi-Skilled Worker',
                'employment_type': 'Contract Labour',
                'wage_type': 'daily_wage',
                'daily_wage_rate': 620.0,
                'monthly_salary': 0.0,
                'phone': '9825011002',
                'bank_account_no': '918237461929',
                'bank_ifsc': 'SBIN0001234',
                'bank_name': 'State Bank of India',
                'uan': '101293847582',
                'esic_ip_number': '3718293848',
                'pan': 'CKTPS1929B',
                'pf_applicable': True,
                'esic_applicable': True,
                'pt_applicable': True,
                'gender': 'Male'
            },
            {
                'emp_code': 'GP-0003',
                'full_name': 'Sunil Badhai',
                'father_name': 'Kishan Badhai',
                'designation': 'Helper / Material Handler',
                'department_code': 'CIV',
                'location_code': 'SND-1',
                'employment_category': 'Unskilled Worker',
                'employment_type': 'Daily Wage Worker',
                'wage_type': 'daily_wage',
                'daily_wage_rate': 480.0,
                'monthly_salary': 0.0,
                'phone': '9825011003',
                'bank_account_no': '918237461930',
                'bank_ifsc': 'SBIN0001234',
                'bank_name': 'State Bank of India',
                'uan': '101293847583',
                'esic_ip_number': '3718293849',
                'pan': 'DKUPS1930C',
                'pf_applicable': True,
                'esic_applicable': True,
                'pt_applicable': True,
                'gender': 'Male'
            },
            # Monthly Salaried Employees (Plant Staff, Supervisors, QA)
            {
                'emp_code': 'GP-0004',
                'full_name': 'Pradeep Rao',
                'father_name': 'Venkat Rao',
                'designation': 'Shop Floor Supervisor',
                'department_code': 'OPS',
                'location_code': 'SND-1',
                'employment_category': 'Monthly Salary Employee',
                'employment_type': 'Permanent Employee',
                'wage_type': 'monthly_salary',
                'daily_wage_rate': 0.0,
                'monthly_salary': 28000.0,
                'phone': '9825011004',
                'bank_account_no': '918237461931',
                'bank_ifsc': 'HDFC0001823',
                'bank_name': 'HDFC Bank',
                'uan': '101293847584',
                'esic_ip_number': '', # Exempt (Gross > 21k)
                'pan': 'EKVPS1931D',
                'pf_applicable': True,
                'esic_applicable': False,
                'pt_applicable': True,
                'gender': 'Male',
                'struct': {
                    'basic': 16000.0,
                    'da': 4000.0,
                    'hra': 5000.0,
                    'conveyance': 1500.0,
                    'special': 1500.0
                }
            },
            {
                'emp_code': 'GP-0005',
                'full_name': 'Pooja Dave',
                'father_name': 'Hitesh Dave',
                'designation': 'Quality Inspector (QA/QC)',
                'department_code': 'QA',
                'location_code': 'SND-1',
                'employment_category': 'Monthly Salary Employee',
                'employment_type': 'Permanent Employee',
                'wage_type': 'monthly_salary',
                'daily_wage_rate': 0.0,
                'monthly_salary': 19500.0, # Eligible for ESIC (< 21000)
                'phone': '9825011005',
                'bank_account_no': '918237461932',
                'bank_ifsc': 'ICIC0000982',
                'bank_name': 'ICICI Bank',
                'uan': '101293847585',
                'esic_ip_number': '3718293851',
                'pan': 'FKWPS1932E',
                'pf_applicable': True,
                'esic_applicable': True,
                'pt_applicable': True,
                'gender': 'Female',
                'struct': {
                    'basic': 11000.0,
                    'da': 2500.0,
                    'hra': 4000.0,
                    'conveyance': 1000.0,
                    'special': 1000.0
                }
            },
            {
                'emp_code': 'GP-0006',
                'full_name': 'Sanjay Kadam',
                'father_name': 'Balwant Kadam',
                'designation': 'High-Voltage Electrician',
                'department_code': 'ELE',
                'location_code': 'CKN',
                'employment_category': 'Skilled Worker',
                'employment_type': 'Full-Time',
                'wage_type': 'daily_wage',
                'daily_wage_rate': 720.0,
                'monthly_salary': 0.0,
                'phone': '9825011006',
                'bank_account_no': '918237461933',
                'bank_ifsc': 'MAHB0000341',
                'bank_name': 'Bank of Maharashtra',
                'uan': '101293847586',
                'esic_ip_number': '3718293852',
                'pan': 'GKYPS1933F',
                'pf_applicable': True,
                'esic_applicable': True,
                'pt_applicable': True,
                'gender': 'Male'
            }
        ]

        created_employees = []
        for ed in employees_seed_data:
            emp = Employee.query.filter_by(emp_code=ed['emp_code']).first()
            if not emp:
                dept = departments[ed['department_code']]
                loc = locations[ed['location_code']]
                emp = Employee(
                    emp_code=ed['emp_code'],
                    company_id=comp.id,
                    location_id=loc.id,
                    department_id=dept.id,
                    full_name=ed['full_name'],
                    father_name=ed['father_name'],
                    dob=date(1992, 4, 15),
                    gender=ed.get('gender', 'Male'),
                    phone=ed['phone'],
                    email=f"{ed['emp_code'].lower()}@grouponpower.com",
                    address="Worker Housing Colony, Sanand",
                    designation=ed['designation'],
                    employment_category=ed['employment_category'],
                    employment_type=ed['employment_type'],
                    join_date=date(2025, 1, 10),
                    status='Active',
                    is_active=True,
                    wage_type=ed['wage_type'],
                    daily_wage_rate=ed['daily_wage_rate'],
                    monthly_salary=ed['monthly_salary'],
                    bank_name=ed['bank_name'],
                    bank_account_no=ed['bank_account_no'],
                    bank_ifsc=ed['bank_ifsc'],
                    uan=ed['uan'],
                    esic_ip_number=ed['esic_ip_number'],
                    pan=ed['pan'],
                    pf_applicable=ed['pf_applicable'],
                    esic_applicable=ed['esic_applicable'],
                    pt_applicable=ed['pt_applicable']
                )
                db.session.add(emp)
                db.session.flush()

                st_info = ed.get('struct', {})
                struct = SalaryStructure(
                    employee_id=emp.id,
                    basic_pay=st_info.get('basic', emp.daily_wage_rate if emp.wage_type == 'daily_wage' else emp.monthly_salary),
                    da=st_info.get('da', 0.0),
                    hra=st_info.get('hra', 0.0),
                    conveyance=st_info.get('conveyance', 0.0),
                    special_allowance=st_info.get('special', 0.0),
                    overtime_rate_per_hour=0.0, # Uses default double rate formula
                    is_active=True
                )
                db.session.add(struct)
            created_employees.append(emp)

        # 6. Seed Attendance for the Current Month (e.g. November 2026)
        today = date.today()
        # Seed 25 days of realistic attendance
        for emp in created_employees:
            for day_idx in range(1, min(26, today.day + 1)):
                att_date = date(today.year, today.month, day_idx)
                existing = Attendance.query.filter_by(employee_id=emp.id, date=att_date).first()
                if not existing:
                    # Sunday is Weekly Off
                    if att_date.weekday() == 6:
                        status = 'Weekly Off'
                        ot = 0.0
                    elif day_idx == 12:
                        status = 'Half Day' if emp.id % 2 == 0 else 'Present'
                        ot = 0.0
                    elif day_idx == 18 and emp.id == 3:
                        status = 'Absent'
                        ot = 0.0
                    else:
                        status = 'Present'
                        ot = 2.0 if (emp.wage_type == 'daily_wage' and day_idx in [5, 10, 15, 20]) else 0.0

                    att = Attendance(
                        employee_id=emp.id,
                        date=att_date,
                        status=status,
                        working_hours=8.0 if status == 'Present' else (4.0 if status == 'Half Day' else 0.0),
                        overtime_hours=ot,
                        shift='General',
                        is_locked=False
                    )
                    db.session.add(att)

        # 7. Seed Sample Advance
        adv1 = Advance.query.filter_by(employee_id=created_employees[0].id).first()
        if not adv1:
            adv1 = Advance(
                employee_id=created_employees[0].id,
                request_date=date(today.year, today.month, 1),
                amount=5000.0,
                monthly_installment=1500.0,
                remaining_amount=5000.0,
                reason="Medical emergency for child",
                payment_mode="Cash",
                status="Approved"
            )
            db.session.add(adv1)

        db.session.commit()
        print("Database seed completed successfully with enterprise roles, company data, workers, statutory rules, attendance, and advances!")

if __name__ == '__main__':
    seed_database()
