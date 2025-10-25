# cloudcode_backend/api/analysis_routes.py
from flask import Blueprint, request, jsonify
from ..services.analysis_service import analyze_git_repository

analysis_bp = Blueprint('analysis_bp', __name__)

@analysis_bp.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    if not data or 'repositoryUrl' not in data:
        return jsonify({"error": "repositoryUrl is required"}), 400
    
    repo_url = data['repositoryUrl']
    try:
        report = analyze_git_repository(repo_url)
        return jsonify(report), 200
    except Exception as e:
        # This will be caught by our custom error handler
        raise e