# cloudcode_backend/api/security_routes.py
from flask import Blueprint, request, jsonify
from ..services.ai_service import ai_service

security_bp = Blueprint('security_bp', __name__)

@security_bp.route('/scan', methods=['POST'])
def scan():
    data = request.get_json()
    code_batch = data.get('code_batch')
    if not code_batch:
        return jsonify({"error": "code_batch is required"}), 400

    vulnerabilities = ai_service.scan_for_vulnerabilities(code_batch)
    return jsonify(vulnerabilities), 200