import os
import sys
from pathlib import Path

backend_path = str(Path(__file__).resolve().parents[1] / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

if not os.environ.get("DATABASE_URL"):
    database_url = os.environ.get("DATABASE_POSTGRES_URL")
    if database_url:
        os.environ["DATABASE_URL"] = database_url

required_settings = ("DATABASE_URL", "SECRET_KEY", "JWT_SECRET_KEY")
missing_settings = [name for name in required_settings if not os.environ.get(name)]
if missing_settings:
    raise RuntimeError(
        "Missing required Vercel environment variables: "
        + ", ".join(missing_settings)
    )

from app import create_app
from app.config import Config
from app.database import db

app = create_app(Config)

with app.app_context():
    db.create_all()

    from app.models.user import User

    if User.query.count() == 0:
        from app.seed import seed_database

        seed_database()
