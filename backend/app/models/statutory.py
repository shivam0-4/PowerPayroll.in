from datetime import datetime, timezone, date
import json
from app.database import db

class StatutoryRule(db.Model):
    __tablename__ = 'statutory_rules'

    id = db.Column(db.Integer, primary_key=True)
    rule_name = db.Column(db.String(120), nullable=False)
    rule_code = db.Column(db.String(50), nullable=False, index=True)
    statutory_component = db.Column(db.String(30), nullable=False, index=True) # EPF, ESIC, PT, TDS, LWF
    state = db.Column(db.String(50), default='All India', index=True)
    wage_base = db.Column(db.String(100), default='Basic + DA') # Basic + DA, Gross, Net
    
    employee_rate = db.Column(db.Float, default=0.0) # Percentage (e.g. 12.0, 0.75)
    employer_rate = db.Column(db.Float, default=0.0) # Percentage (e.g. 12.0, 3.25)
    
    ceiling_limit = db.Column(db.Float, nullable=True) # e.g. 15000 for PF, 21000 for ESIC
    exemption_limit = db.Column(db.Float, default=0.0) # Below this exempt
    
    # JSON text storing progressive slabs for Professional Tax or TDS
    slab_configuration = db.Column(db.Text, nullable=True)
    
    applicable_category = db.Column(db.String(100), default='All') # All, Daily Wage Worker, Monthly Salary, Contract
    source_reference = db.Column(db.String(255))
    effective_from = db.Column(db.Date, nullable=False, default=date(2026, 1, 1))
    effective_until = db.Column(db.Date, nullable=True)
    
    approval_status = db.Column(db.String(30), default='Approved', index=True) # Approved, Pending Review, Draft
    requires_accountant_review = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def get_slabs(self):
        if not self.slab_configuration:
            return []
        try:
            return json.loads(self.slab_configuration)
        except Exception:
            return []

    def to_dict(self):
        return {
            'id': self.id,
            'rule_name': self.rule_name,
            'rule_code': self.rule_code,
            'statutory_component': self.statutory_component,
            'state': self.state,
            'wage_base': self.wage_base,
            'employee_rate': self.employee_rate,
            'employer_rate': self.employer_rate,
            'ceiling_limit': self.ceiling_limit,
            'exemption_limit': self.exemption_limit,
            'slab_configuration': self.get_slabs(),
            'applicable_category': self.applicable_category,
            'source_reference': self.source_reference,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None,
            'effective_until': self.effective_until.isoformat() if self.effective_until else None,
            'approval_status': self.approval_status,
            'requires_accountant_review': self.requires_accountant_review,
            'is_active': self.is_active
        }
