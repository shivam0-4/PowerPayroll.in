import os
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from app.config import Config
from app.database import db, migrate, jwt

def create_app(config_class=Config):
    dist_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))

    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)
    app.url_map.strict_slashes = False

    # Enable CORS for frontend Vite development & production
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.user import user_bp
    from app.routes.company import company_bp
    from app.routes.employee import employee_bp
    from app.routes.attendance import attendance_bp
    from app.routes.statutory import statutory_bp
    from app.routes.advance import advance_bp
    from app.routes.payroll import payroll_bp
    from app.routes.payslip import payslip_bp
    from app.routes.payment import payment_bp
    from app.routes.report import report_bp
    from app.routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(employee_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(statutory_bp)
    app.register_blueprint(advance_bp)
    app.register_blueprint(payroll_bp)
    app.register_blueprint(payslip_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(dashboard_bp)

    @app.route('/api', methods=['GET'])
    @app.route('/api/', methods=['GET'])
    def api_index():
        return jsonify({
            'system': 'GROUPON POWER Labour Management & Payroll ERP API',
            'status': 'online',
            'version': '2.0.0',
            'documentation': {
                'health': '/api/health',
                'auth': '/api/auth/login',
                'profile': '/api/auth/me',
                'dashboard': '/api/dashboard/analytics',
                'employees': '/api/employees',
                'attendance': '/api/attendance',
                'payroll': '/api/payroll',
                'payslips': '/api/payslips',
                'advances': '/api/advances',
                'payments': '/api/payments',
                'statutory': '/api/statutory/rules',
                'reports': '/api/reports'
            }
        }), 200

    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'system': 'GROUPON POWER Labour Management & Payroll ERP',
            'version': '2.0.0'
        }), 200

    # Serve built frontend assets
    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        assets_dir = os.path.join(dist_folder, 'assets')
        if os.path.exists(assets_dir):
            return send_from_directory(assets_dir, filename)
        return jsonify({'error': 'Asset not found'}), 404

    # Catch-all route: serves frontend build or clean landing page
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        # If an unknown API route was requested, return 404 JSON
        if path.startswith('api/') or path == 'api':
            return jsonify({
                'error': 'Resource not found',
                'requested_path': f'/{path}',
                'api_documentation': '/api'
            }), 404

        # If frontend build exists, serve static file or index.html for SPA routing
        if os.path.exists(dist_folder):
            candidate_file = os.path.join(dist_folder, path)
            if path and os.path.isfile(candidate_file):
                return send_from_directory(dist_folder, path)
            # Serve index.html for /login, /dashboard, /employees, /payroll, etc.
            return send_from_directory(dist_folder, 'index.html')

        # Fallback if frontend is not yet built
        return jsonify({
            'system': 'GROUPON POWER Enterprise Labour Management & Payroll System',
            'status': 'online',
            'version': '2.0.0',
            'message': 'API server running. Build frontend with `pnpm run build` or launch Vite dev server at http://localhost:3000',
            'api_directory': '/api'
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            'error': 'Resource not found',
            'requested_url': request.url,
            'api_directory': '/api'
        }), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    # Ensure upload folder exists
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)

    return app
