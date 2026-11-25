from datetime import datetime, timezone
from app.database import db

class Company(db.Model):
    __tablename__ = 'companies'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    logo_url = db.Column(db.String(255))
    registered_address = db.Column(db.Text)
    gst_no = db.Column(db.String(20))
    pan_no = db.Column(db.String(15))
    tan_no = db.Column(db.String(15))
    pf_establishment_code = db.Column(db.String(30))
    esic_employer_code = db.Column(db.String(30))
    bank_name = db.Column(db.String(100))
    bank_account_no = db.Column(db.String(50))
    bank_ifsc = db.Column(db.String(20))
    bank_branch = db.Column(db.String(100))
    contact_email = db.Column(db.String(100))
    contact_phone = db.Column(db.String(20))
    financial_year = db.Column(db.String(20), default='2026-2027')
    default_overtime_multiplier = db.Column(db.Float, default=2.0) # Double normal rate as per Indian Factories Act
    daily_working_hours = db.Column(db.Float, default=8.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    locations = db.relationship('WorkLocation', back_populates='company', cascade='all, delete-orphan')
    departments = db.relationship('Department', back_populates='company', cascade='all, delete-orphan')
    employees = db.relationship('Employee', back_populates='company')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'logo_url': self.logo_url,
            'registered_address': self.registered_address,
            'gst_no': self.gst_no,
            'pan_no': self.pan_no,
            'tan_no': self.tan_no,
            'pf_establishment_code': self.pf_establishment_code,
            'esic_employer_code': self.esic_employer_code,
            'bank_name': self.bank_name,
            'bank_account_no': self.bank_account_no,
            'bank_ifsc': self.bank_ifsc,
            'bank_branch': self.bank_branch,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'financial_year': self.financial_year,
            'default_overtime_multiplier': self.default_overtime_multiplier,
            'daily_working_hours': self.daily_working_hours,
            'locations_count': len(self.locations) if self.locations else 0,
            'departments_count': len(self.departments) if self.departments else 0
        }

class WorkLocation(db.Model):
    __tablename__ = 'work_locations'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    location_name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), index=True)
    address = db.Column(db.String(255))
    city = db.Column(db.String(50))
    state = db.Column(db.String(50), default='Gujarat')
    is_active = db.Column(db.Boolean, default=True)

    company = db.relationship('Company', back_populates='locations')
    employees = db.relationship('Employee', back_populates='work_location')

    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'location_name': self.location_name,
            'code': self.code,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'is_active': self.is_active
        }

class Department(db.Model):
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    department_name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), index=True)
    description = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)

    company = db.relationship('Company', back_populates='departments')
    employees = db.relationship('Employee', back_populates='department')

    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'department_name': self.department_name,
            'code': self.code,
            'description': self.description,
            'is_active': self.is_active
        }
