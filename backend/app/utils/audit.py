import json
from datetime import datetime, timezone
from app.database import db
from app.models.user import AuditLog, Notification

def log_audit(user_id, action, entity_type, entity_id, details=None, ip_address=None):
    try:
        details_str = json.dumps(details) if isinstance(details, (dict, list)) else (str(details) if details else None)
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            ip_address=ip_address,
            details=details_str,
            timestamp=datetime.now(timezone.utc)
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Non-blocking for primary transaction
        print(f"Audit log failed: {e}")

def create_notification(user_id, title, message, notif_type='info', link=None):
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notif_type,
            link=link
        )
        db.session.add(notif)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Notification creation failed: {e}")
