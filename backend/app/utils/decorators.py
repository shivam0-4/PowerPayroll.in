from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models.user import User, Permission

def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            user = User.query.get(int(current_user_id))
            if not user or not user.is_active:
                return jsonify({'error': 'Account is inactive or disabled'}), 403
            return fn(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Authentication required or token expired', 'details': str(e)}), 401
    return wrapper

def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            user = User.query.get(int(current_user_id))
            if not user or not user.is_active:
                return jsonify({'error': 'Account is inactive'}), 403
            
            # Super Admin always has full access
            if user.role and user.role.name == 'Super Admin':
                return fn(*args, **kwargs)
            
            if not user.role or user.role.name not in allowed_roles:
                return jsonify({
                    'error': 'Permission denied',
                    'message': f"Access restricted. Required roles: {', '.join(allowed_roles)}. Your role: {user.role.name if user.role else 'None'}"
                }), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def permission_required(module, action='read'):
    """
    Action can be: 'create', 'read', 'update', 'delete', 'approve'
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            user = User.query.get(int(current_user_id))
            if not user or not user.is_active:
                return jsonify({'error': 'Account is inactive'}), 403
            
            if user.role and user.role.name == 'Super Admin':
                return fn(*args, **kwargs)

            # Check permissions table for role
            perm = Permission.query.filter_by(role_id=user.role_id, module=module).first()
            if not perm:
                return jsonify({'error': f"Access forbidden to module '{module}'"}), 403

            has_perm = getattr(perm, f"can_{action}", False)
            if not has_perm:
                return jsonify({'error': f"Operation '{action}' not authorized on module '{module}'"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
