from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.database import db
from app.models.user import User, Role, Permission, AuditLog
from app.utils.decorators import token_required, role_required
from app.utils.audit import log_audit

user_bp = Blueprint('users', __name__, url_prefix='/api/users')

@user_bp.route('', methods=['GET'])
@token_required
@role_required('Super Admin', 'HR Manager')
def get_users():
    users = User.query.order_by(User.id.asc()).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200

@user_bp.route('', methods=['POST'])
@token_required
@role_required('Super Admin')
def create_user():
    current_uid = int(get_jwt_identity())
    data = request.get_json() or {}
    
    email = data.get('email', '').strip().lower()
    full_name = data.get('full_name', '').strip()
    password = data.get('password', '')
    role_id = data.get('role_id')
    phone = data.get('phone')

    if not email or not full_name or not password or not role_id:
        return jsonify({'error': 'Email, full name, password, and role are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'User with this email already exists'}), 400

    role = Role.query.get(role_id)
    if not role:
        return jsonify({'error': 'Invalid role ID'}), 400

    new_user = User(
        email=email,
        full_name=full_name,
        phone=phone,
        role_id=role_id,
        is_active=True
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    log_audit(user_id=current_uid, action='USER_CREATE', entity_type='User', entity_id=new_user.id, details={'email': email, 'role': role.name})

    return jsonify({'message': 'User created successfully', 'user': new_user.to_dict()}), 201

@user_bp.route('/<int:user_id>/toggle-status', methods=['PUT'])
@token_required
@role_required('Super Admin')
def toggle_user_status(user_id):
    current_uid = int(get_jwt_identity())
    if current_uid == user_id:
        return jsonify({'error': 'Cannot deactivate your own account'}), 400

    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()

    log_audit(user_id=current_uid, action='USER_STATUS_TOGGLE', entity_type='User', entity_id=user.id, details={'is_active': user.is_active})
    return jsonify({'message': f"User {'activated' if user.is_active else 'deactivated'} successfully", 'user': user.to_dict()}), 200

@user_bp.route('/roles', methods=['GET'])
@token_required
def get_roles():
    roles = Role.query.all()
    return jsonify({'roles': [r.to_dict() for r in roles]}), 200

@user_bp.route('/audit-logs', methods=['GET'])
@token_required
@role_required('Super Admin', 'Accountant', 'HR Manager')
def get_audit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    logs_pagination = AuditLog.query.order_by(AuditLog.timestamp.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'logs': [l.to_dict() for l in logs_pagination.items],
        'total': logs_pagination.total,
        'pages': logs_pagination.pages,
        'current_page': page
    }), 200
