# cloudcode_backend/__init__.py
from flask import Flask
from flask_cors import CORS
from config import config_by_name

def create_app(config_name: str) -> Flask:
    """
    Creates and configures an instance of the Flask application.
    """
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Enable CORS for all routes
    CORS(app)

    # Import and register Blueprints for different parts of the API
    from .api.analysis_routes import analysis_bp
    from .api.refactor_routes import refactor_bp
    from .api.security_routes import security_bp

    app.register_blueprint(analysis_bp, url_prefix='/')
    app.register_blueprint(refactor_bp, url_prefix='/refactor')
    app.register_blueprint(security_bp, url_prefix='/security')
    
    # Register error handlers
    from .errors.handlers import register_error_handlers
    register_error_handlers(app)

    return app