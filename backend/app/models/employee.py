from datetime import datetime, timezone, date
from app.database import db

class Employee(db.Model):
    __tablename__ = 'employees'

    id = db.Column(db.Integer, primary_key=True)
    emp_code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, default=1, index=True)
    location_id = db.Column(db.Integer, db.ForeignKey('work_locations.id'), nullable=True, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True, index=True)
    
    # Personal Information
    full_name = db.Column(db.String(120), nullable=False, index=True)
    father_name = db.Column(db.String(120))
    dob = db.Column(db.Date)
    gender = db.Column(db.String(20), default='Male') # Male, Female, Other
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120))
    address = db.Column(db.Text)
    emergency_contact = db.Column(db.String(120))
    emergency_phone = db.Column(db.String(20))

    # Employment Information
    designation = db.Column(db.String(100), nullable=False)
    employment_category = db.Column(db.String(50), nullable=False, default='Daily Wage Worker')
    # e.g., Daily Wage Worker, Monthly Salary Employee, Contract Labour, Temporary Worker, Permanent Employee, Skilled Worker, Unskilled Worker
    employment_type = db.Column(db.String(50), default='Full-Time') # Full-Time, Part-Time, Contract, Trainee
    join_date = db.Column(db.Date, nullable=False, default=date.today)
    exit_date = db.Column(db.Date, nullable=True)
    supervisor_name = db.Column(db.String(100))
    status = db.Column(db.String(30), default='Active', index=True) # Active, Inactive, On-Leave, Terminated
    is_active = db.Column(db.Boolean, default=True, index=True)

    # Financial & Wage Configuration
    wage_type = db.Column(db.String(30), nullable=False, default='daily_wage') # daily_wage, monthly_salary
    daily_wage_rate = db.Column(db.Float, default=0.0)
    monthly_salary = db.Column(db.Float, default=0.0)
    
    # Bank & Statutory Details
    bank_name = db.Column(db.String(100))
    bank_account_no = db.Column(db.String(50))
    bank_ifsc = db.Column(db.String(20))
    uan = db.Column(db.String(30))
    esic_ip_number = db.Column(db.String(30))
    pan = db.Column(db.String(20))

    # Statutory Eligibility Flags
    pf_applicable = db.Column(db.Boolean, default=True)
    esic_applicable = db.Column(db.Boolean, default=True)
    pt_applicable = db.Column(db.Boolean, default=True)
    tds_applicable = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    company = db.relationship('Company', back_populates='employees')
    work_location = db.relationship('WorkLocation', back_populates='employees')
    department = db.relationship('Department', back_populates='employees')
    documents = db.relationship('EmployeeDocument', back_populates='employee', cascade='all, delete-orphan')
    salary_structures = db.relationship('SalaryStructure', back_populates='employee', cascade='all, delete-orphan')
    attendance_records = db.relationship('Attendance', back_populates='employee', cascade='all, delete-orphan', lazy='dynamic')
    advances = db.relationship('Advance', back_populates='employee', cascade='all, delete-orphan', lazy='dynamic')
    payroll_records = db.relationship('PayrollRecord', back_populates='employee', cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self, include_financial=True):
        data = {
            'id': self.id,
            'emp_code': self.emp_code,
            'company_id': self.company_id,
            'location_id': self.location_id,
            'location_name': self.work_location.location_name if self.work_location else None,
            'department_id': self.department_id,
            'department_name': self.department.department_name if self.department else None,
            'full_name': self.full_name,
            'father_name': self.father_name,
            'dob': self.dob.isoformat() if self.dob else None,
            'gender': self.gender,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'emergency_contact': self.emergency_contact,
            'emergency_phone': self.emergency_phone,
            'designation': self.designation,
            'employment_category': self.employment_category,
            'employment_type': self.employment_type,
            'join_date': self.join_date.isoformat() if self.join_date else None,
            'exit_date': self.exit_date.isoformat() if self.exit_date else None,
            'supervisor_name': self.supervisor_name,
            'status': self.status,
            'is_active': self.is_active,
            'wage_type': self.wage_type,
            'pf_applicable': self.pf_applicable,
            'esic_applicable': self.esic_applicable,
            'pt_applicable': self.pt_applicable,
            'tds_applicable': self.tds_applicable,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

        if include_financial:
            data.update({
                'daily_wage_rate': self.daily_wage_rate,
                'monthly_salary': self.monthly_salary,
                'bank_name': self.bank_name,
                'bank_account_no': self.bank_account_no,
                'bank_ifsc': self.bank_ifsc,
                'uan': self.uan,
                'esic_ip_number': self.esic_ip_number,
                'pan': self.pan
            })
        else:
            # Mask sensitive account details for lower privilege roles
            data.update({
                'bank_name': self.bank_name,
                'bank_account_no': ('X' * (len(self.bank_account_no) - 4) + self.bank_account_no[-4:]) if self.bank_account_no and len(self.bank_account_no) > 4 else 'XXXX',
                'bank_ifsc': self.bank_ifsc,
                'uan': ('X' * 8 + self.uan[-4:]) if self.uan and len(self.uan) > 4 else None,
                'esic_ip_number': self.esic_ip_number,
                'pan': ('X' * 6 + self.pan[-4:]) if self.pan and len(self.pan) > 4 else None
            })

        return data

class EmployeeDocument(db.Model):
    __tablename__ = 'employee_documents'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    doc_type = db.Column(db.String(50), nullable=False) # Photograph, Aadhaar, PAN Card, Joining Document, Contract, Other
    doc_name = db.Column(db.String(150), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_size_bytes = db.Column(db.Integer, default=0)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    employee = db.relationship('Employee', back_populates='documents')

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'doc_type': self.doc_type,
            'doc_name': self.doc_name,
            'file_path': self.file_path,
            'file_size_bytes': self.file_size_bytes,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class SalaryStructure(db.Model):
    __tablename__ = 'salary_structures'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    effective_from = db.Column(db.Date, nullable=False, default=date.today)
    effective_to = db.Column(db.Date, nullable=True)
    
    # Base Components
    basic_pay = db.Column(db.Float, default=0.0) # Basic per month or base per day
    da = db.Column(db.Float, default=0.0) # Dearness Allowance
    hra = db.Column(db.Float, default=0.0) # House Rent Allowance
    conveyance = db.Column(db.Float, default=0.0) # Travel / Conveyance
    special_allowance = db.Column(db.Float, default=0.0)
    other_allowances = db.Column(db.Float, default=0.0)
    incentive = db.Column(db.Float, default=0.0)
    production_bonus = db.Column(db.Float, default=0.0)
    overtime_rate_per_hour = db.Column(db.Float, default=0.0)
    
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    employee = db.relationship('Employee', back_populates='salary_structures')

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None,
            'effective_to': self.effective_to.isoformat() if self.effective_to else None,
            'basic_pay': self.basic_pay,
            'da': self.da,
            'hra': self.hra,
            'conveyance': self.conveyance,
            'special_allowance': self.special_allowance,
            'other_allowances': self.other_allowances,
            'incentive': self.incentive,
            'production_bonus': self.production_bonus,
            'overtime_rate_per_hour': self.overtime_rate_per_hour,
            'total_fixed_earnings': (self.basic_pay + self.da + self.hra + self.conveyance + self.special_allowance + self.other_allowances),
            'is_active': self.is_active
        }

class SalaryComponent(db.Model):
    __tablename__ = 'salary_components'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    component_type = db.Column(db.String(20), nullable=False) # earning, deduction
    is_taxable = db.Column(db.Boolean, default=True)
    is_statutory = db.Column(db.Boolean, default=False)
    calculation_type = db.Column(db.String(30), default='fixed') # fixed, percentage_of_basic, formula
    default_value = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'component_type': self.component_type,
            'is_taxable': self.is_taxable,
            'is_statutory': self.is_statutory,
            'calculation_type': self.calculation_type,
            'default_value': self.default_value,
            'is_active': self.is_active
        }
