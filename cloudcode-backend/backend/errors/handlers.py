# cloudcode_backend/errors/handlers.py
from flask import jsonify
import subprocess

def register_error_handlers(app):
    @app.errorhandler(subprocess.CalledProcessError)
    def handle_subprocess_error(error):
        """Handle errors from external command execution."""
        app.logger.error(f"Subprocess error: {error.stderr}")
        response = {
            "error": "An external command failed during analysis.",
            "details": error.stderr
        }
        return jsonify(response), 500

    @app.errorhandler(ValueError)
    def handle_value_error(error):
        """Handle ValueErrors, such as a missing API key."""
        app.logger.error(f"Value error: {str(error)}")
        return jsonify({"error": str(error)}), 400

    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        """Handle all other unexpected exceptions."""
        app.logger.error(f"An unexpected error occurred: {str(error)}")
        return jsonify({"error": "An internal server error occurred."}), 500