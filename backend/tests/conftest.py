import pytest
from app import create_app
from app.config import TestingConfig
from app.database import db
from app.models.user import User, Role, Permission
from app.models.company import Company, Department, WorkLocation
from app.models.statutory import StatutoryRule
from app.models.employee import Employee, SalaryStructure

@pytest.fixture
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        # Create base test role and user
        admin_role = Role(name='Super Admin', is_system=True)
        viewer_role = Role(name='Viewer', is_system=True)
        hr_role = Role(name='HR Manager', is_system=True)
        acct_role = Role(name='Accountant', is_system=True)
        db.session.add_all([admin_role, viewer_role, hr_role, acct_role])
        db.session.flush()

        comp = Company(name='GROUPON POWER TEST', gst_no='24AABCG1234F1Z5')
        db.session.add(comp)
        db.session.flush()

        dept = Department(company_id=comp.id, department_name='Welding', code='WLD')
        loc = WorkLocation(company_id=comp.id, location_name='Sanand Plant', code='SND', state='Gujarat')
        db.session.add_all([dept, loc])
        db.session.flush()

        # Seed statutory rules
        pf_rule = StatutoryRule(
            rule_name="EPF Employee",
            rule_code="EPF_EE",
            statutory_component="EPF",
            state="All India",
            wage_base="Basic + DA",
            employee_rate=12.0,
            ceiling_limit=15000.0,
            is_active=True
        )
        esic_rule = StatutoryRule(
            rule_name="ESIC Employee",
            rule_code="ESIC_EE",
            statutory_component="ESIC",
            state="All India",
            wage_base="Gross Wages",
            employee_rate=0.75,
            ceiling_limit=21000.0,
            is_active=True
        )
        db.session.add_all([pf_rule, esic_rule])

        admin = User(email='admin@test.com', full_name='Admin Test', role_id=admin_role.id, is_active=True)
        admin.set_password('Admin@123')

        viewer = User(email='viewer@test.com', full_name='Viewer Test', role_id=viewer_role.id, is_active=True)
        viewer.set_password('Viewer@123')

        db.session.add_all([admin, viewer])
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_token(client):
    res = client.post('/api/auth/login', json={'email': 'admin@test.com', 'password': 'Admin@123'})
    return res.get_json()['access_token']

@pytest.fixture
def viewer_token(client):
    res = client.post('/api/auth/login', json={'email': 'viewer@test.com', 'password': 'Viewer@123'})
    return res.get_json()['access_token']
