from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from app.database import db
from app.models.user import User, Role, Permission
from app.utils.decorators import token_required, role_required
from app.utils.audit import log_audit

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account has been deactivated. Please contact an administrator.'}), 403

    user.last_login_at = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    log_audit(user_id=user.id, action='LOGIN', entity_type='User', entity_id=user.id, ip_address=request.remote_addr)

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role.name if user.role else 'Viewer',
            'permissions': [p.to_dict() for p in user.role.permissions] if user.role else []
        }
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    new_token = create_access_token(identity=identity)
    return jsonify({'access_token': new_token}), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'user': {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'phone': user.phone,
            'role': user.role.name if user.role else 'Viewer',
            'permissions': [p.to_dict() for p in user.role.permissions] if user.role else [],
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None
        }
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    data = request.get_json() or {}
    
    current_pw = data.get('current_password')
    new_pw = data.get('new_password')

    if not current_pw or not new_pw:
        return jsonify({'error': 'Current and new password are required'}), 400

    if not user.check_password(current_pw):
        return jsonify({'error': 'Current password is incorrect'}), 400

    if len(new_pw) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    user.set_password(new_pw)
    db.session.commit()
    log_audit(user_id=user.id, action='PASSWORD_CHANGE', entity_type='User', entity_id=user.id)

    return jsonify({'message': 'Password changed successfully'}), 200

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    user_id = int(get_jwt_identity())
    log_audit(user_id=user_id, action='LOGOUT', entity_type='User', entity_id=user_id)
    return jsonify({'message': 'Logged out successfully'}), 200
