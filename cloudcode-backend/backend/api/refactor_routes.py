# cloudcode_backend/api/refactor_routes.py
from flask import Blueprint, request, jsonify
from ..services.ai_service import ai_service

refactor_bp = Blueprint('refactor_bp', __name__)

@refactor_bp.route('/modernize', methods=['POST'])
def modernize():
    data = request.get_json()
    code = data.get('code_snippet')
    lang = data.get('language', 'code') # Default to generic 'code'
    if not code:
        return jsonify({"error": "code_snippet is required"}), 400

    modernized_code = ai_service.modernize_code(code, lang)
    return jsonify({"modernizedCode": modernized_code})

@refactor_bp.route('/explain-code', methods=['POST'])
def explain():
    data = request.get_json()
    code = data.get('code_snippet')
    if not code:
        return jsonify({"error": "code_snippet is required"}), 400
        
    explanation = ai_service.explain_code(code)
    return jsonify({"explanation": explanation})

@refactor_bp.route('/generate-doc', methods=['POST'])
def generate_doc():
    """
    API endpoint to generate documentation for a code snippet.
    """
    data = request.get_json()
    code = data.get('code_snippet')
    lang = data.get('language', 'code')
    if not code:
        return jsonify({"error": "code_snippet is required"}), 400

    documentation = ai_service.generate_documentation(code, lang)
    # The frontend will typically insert this documentation above the selected code.
    return jsonify({"documentation": documentation})