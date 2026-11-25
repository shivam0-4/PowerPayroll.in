#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
#  GROUPON POWER – Backend Container Entrypoint
#  Runs DB migrations, seeds if fresh, then starts Gunicorn.
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "==> [GROUPON POWER] Running database migrations..."
flask db upgrade || {
    echo "==> [GROUPON POWER] Migration failed — attempting db init first..."
    flask db init 2>/dev/null || true
    flask db migrate -m "auto-init" 2>/dev/null || true
    flask db upgrade
}

echo "==> [GROUPON POWER] Seeding initial data if required..."
python -c "
from app import create_app
from app.config import Config
from app.database import db
app = create_app(Config)
with app.app_context():
    from app.models.user import User
    if User.query.count() == 0:
        from app.seed import seed_database
        print('  Seeding fresh database...')
        seed_database()
        print('  Seed complete.')
    else:
        print('  Database already has data — skipping seed.')
" 2>&1

echo "==> [GROUPON POWER] Starting Gunicorn (workers=4)..."
exec gunicorn \
    --bind 0.0.0.0:${PORT:-5000} \
    --workers 4 \
    --worker-class sync \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    "run:app"
