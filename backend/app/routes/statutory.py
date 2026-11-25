import json
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.database import db
from app.models.statutory import StatutoryRule
from app.models.employee import Employee
from app.services.statutory_engine import StatutoryEngine
from app.utils.decorators import token_required, role_required
from app.utils.audit import log_audit

statutory_bp = Blueprint('statutory', __name__, url_prefix='/api/statutory')

@statutory_bp.route('/rules', methods=['GET'])
@token_required
def get_rules():
    component = request.args.get('component')
    state = request.args.get('state')

    query = StatutoryRule.query
    if component:
        query = query.filter(StatutoryRule.statutory_component == component)
    if state:
        query = query.filter(StatutoryRule.state == state)

    rules = query.order_by(StatutoryRule.statutory_component.asc(), StatutoryRule.state.asc()).all()
    return jsonify({'rules': [r.to_dict() for r in rules]}), 200

@statutory_bp.route('/rules', methods=['POST'])
@token_required
@role_required('Super Admin', 'Accountant')
def create_rule():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    rule_name = data.get('rule_name', '').strip()
    rule_code = data.get('rule_code', '').strip().upper()
    component = data.get('statutory_component', '').strip().upper()

    if not rule_name or not rule_code or not component:
        return jsonify({'error': 'Rule name, code, and statutory component are required'}), 400

    slabs = data.get('slab_configuration')
    slabs_json = json.dumps(slabs) if slabs else None

    rule = StatutoryRule(
        rule_name=rule_name,
        rule_code=rule_code,
        statutory_component=component,
        state=data.get('state', 'All India'),
        wage_base=data.get('wage_base', 'Basic + DA'),
        employee_rate=float(data.get('employee_rate', 0.0) or 0.0),
        employer_rate=float(data.get('employer_rate', 0.0) or 0.0),
        ceiling_limit=float(data['ceiling_limit']) if data.get('ceiling_limit') is not None else None,
        exemption_limit=float(data.get('exemption_limit', 0.0) or 0.0),
        slab_configuration=slabs_json,
        applicable_category=data.get('applicable_category', 'All'),
        source_reference=data.get('source_reference'),
        requires_accountant_review=bool(data.get('requires_accountant_review', False)),
        is_active=bool(data.get('is_active', True)),
        approval_status=data.get('approval_status', 'Approved')
    )
    db.session.add(rule)
    db.session.commit()

    log_audit(user_id=user_id, action='STATUTORY_RULE_CREATE', entity_type='StatutoryRule', entity_id=rule.id, details={'code': rule_code})

    return jsonify({'message': 'Statutory rule created successfully', 'rule': rule.to_dict()}), 201

@statutory_bp.route('/rules/<int:rule_id>', methods=['PUT'])
@token_required
@role_required('Super Admin', 'Accountant')
def update_rule(rule_id):
    user_id = int(get_jwt_identity())
    rule = StatutoryRule.query.get_or_404(rule_id)
    data = request.get_json() or {}

    fields = [
        'rule_name', 'rule_code', 'statutory_component', 'state', 'wage_base',
        'employee_rate', 'employer_rate', 'applicable_category', 'source_reference',
        'requires_accountant_review', 'is_active', 'approval_status'
    ]
    for f in fields:
        if f in data:
            val = data[f]
            if f in ['employee_rate', 'employer_rate']:
                val = float(val or 0.0)
            elif f in ['requires_accountant_review', 'is_active']:
                val = bool(val)
            setattr(rule, f, val)

    if 'ceiling_limit' in data:
        rule.ceiling_limit = float(data['ceiling_limit']) if data['ceiling_limit'] is not None else None

    if 'slab_configuration' in data:
        slabs = data['slab_configuration']
        rule.slab_configuration = json.dumps(slabs) if slabs else None

    db.session.commit()
    log_audit(user_id=user_id, action='STATUTORY_RULE_UPDATE', entity_type='StatutoryRule', entity_id=rule.id)

    return jsonify({'message': 'Statutory rule updated successfully', 'rule': rule.to_dict()}), 200

@statutory_bp.route('/preview-calculation', methods=['POST'])
@token_required
def preview_calculation():
    data = request.get_json() or {}
    emp_id = data.get('employee_id')
    gross = float(data.get('gross_earnings', 20000.0))
    basic_da = float(data.get('basic_da_earnings', 15000.0))
    state = data.get('state', 'Gujarat')

    if emp_id:
        emp = Employee.query.get(emp_id)
    else:
        # Dummy employee for preview
        emp = Employee(
            full_name='Test Employee',
            pf_applicable=data.get('pf_applicable', True),
            esic_applicable=data.get('esic_applicable', True),
            pt_applicable=data.get('pt_applicable', True),
            tds_applicable=data.get('tds_applicable', False)
        )

    res = StatutoryEngine.calculate_statutory_deductions(
        employee=emp,
        gross_earnings=gross,
        basic_da_earnings=basic_da,
        state=state
    )

    return jsonify({'preview': res}), 200
