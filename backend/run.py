import os
from app import create_app
from app.config import Config
from app.seed import seed_database

app = create_app(Config)

if __name__ == '__main__':
    # Auto-seed database if fresh
    with app.app_context():
        from app.models.user import User
        if not os.path.exists(os.path.join(os.path.dirname(__file__), 'groupon_power.db')) or User.query.count() == 0:
            print("Initializing and seeding database...")
            seed_database()

    port = int(os.environ.get('PORT', 5000))
    print(f"GROUPON POWER Backend API running on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
