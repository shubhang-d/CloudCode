# cloudcode-backend/app.py

import os
import subprocess
import tempfile
import json
from datetime import datetime
from flask import Flask, request, jsonify

# --- NEW: Import radon for code analysis ---
from radon.metrics import mi_visit
from radon.cli.tools import iter_filenames

app = Flask(__name__)

def run_command(command, working_dir):
    """
    Runs a shell command in a specified directory and returns its output.
    Returns None if the command fails.
    """
    try:
        result = subprocess.run(
            command, 
            cwd=working_dir, 
            check=True, 
            capture_output=True, 
            text=True, 
            encoding='utf-8'
        )
        return result.stdout.strip()
    except Exception as e:
        # Log the error but don't crash the server
        print(f"Error running command: {' '.join(command)}. Error: {e}")
        return None # Return None on error to handle it gracefully

def get_dependency_count(repo_dir):
    """
    Counts dependencies from common package manager files.
    """
    count = 0
    # Node.js
    try:
        with open(os.path.join(repo_dir, 'package.json'), 'r', encoding='utf-8') as f:
            data = json.load(f)
            count += len(data.get('dependencies', {}))
            count += len(data.get('devDependencies', {}))
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    # Python
    try:
        with open(os.path.join(repo_dir, 'requirements.txt'), 'r', encoding='utf-8') as f:
            count += len([line for line in f if line.strip() and not line.strip().startswith('#')])
    except FileNotFoundError:
        pass
    return count

def calculate_technical_debt_ratio(repo_dir):
    """
    Analyzes supported source files in a directory to calculate a technical debt ratio
    based on the average Maintainability Index (MI).
    A higher MI (0-100) is better. Our ratio is 100 - average_mi.
    """
    total_mi_score = 0
    file_count = 0
    
    # Use radon's file finder to get relevant source files (py, js, ts, etc.).
    # Exclude common non-source directories to speed up the process.
    exclude_patterns = "*/node_modules/*,*/venv/*,*/.git/*,*/dist/*,*/build/*"
    # iter_filenames takes a list of paths to scan.
    supported_files = list(iter_filenames([repo_dir], exclude=exclude_patterns))

    for filepath in supported_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                code = f.read()
                # Calculate Maintainability Index for the file's content.
                # A higher MI is better (more maintainable).
                mi = mi_visit(code, multi=True)
                if mi > 0: # Only include files that could be parsed
                    total_mi_score += mi
                    file_count += 1
        except Exception:
            # Silently ignore files that can't be opened or parsed
            # (e.g., binary files, unsupported encodings)
            pass

    if file_count == 0:
        return "N/A"

    average_mi = total_mi_score / file_count
    # Our "debt ratio" is 100 minus the average maintainability.
    # A lower maintainability score results in a higher debt ratio.
    debt_ratio = 100 - average_mi
    return f"{debt_ratio:.2f}%"

@app.route('/analyze', methods=['POST'])
def analyze_project():
    repo_url = request.get_json().get('repositoryUrl')
    if not repo_url:
        return jsonify({"error": "Missing 'repositoryUrl'"}), 400

    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # We add a depth limit to speed up cloning for large repositories
            run_command(['git', 'clone', '--depth=100', repo_url, '.'], temp_dir)
            
            # --- TIER 1 & 3: ACTIVITY METRICS ---
            last_commit_date = run_command(['git', 'log', '-1', '--format=%cd'], temp_dir)
            
            total_commits_str = run_command(['git', 'rev-list', '--all', '--count'], temp_dir)
            total_commits = int(total_commits_str) if total_commits_str else 0
            
            contributor_count_str = run_command(['git', 'shortlog', '-s', '-n', '--all'], temp_dir)
            contributor_count = len(contributor_count_str.splitlines()) if contributor_count_str else 0

            active_branches_str = run_command(['git', 'branch', '-r'], temp_dir)
            active_branches = len(active_branches_str.splitlines()) if active_branches_str else 0
            
            # Calculate commit frequency
            first_commit_unix_ts_str = run_command(['git', 'rev-list', '--max-parents=0', 'HEAD', '--format=%ct'], temp_dir)
            last_commit_unix_ts_str = run_command(['git', 'log', '-1', '--format=%ct'], temp_dir)

            commit_frequency = 0
            if first_commit_unix_ts_str and last_commit_unix_ts_str:
                first_commit_unix_ts = int(first_commit_unix_ts_str.splitlines()[-1])
                last_commit_unix_ts = int(last_commit_unix_ts_str)
                project_age_seconds = last_commit_unix_ts - first_commit_unix_ts
                # Avoid division by zero for very new projects
                if project_age_seconds > 0:
                    project_age_months = project_age_seconds / (86400 * 30.44)
                    commit_frequency = total_commits / project_age_months if project_age_months > 0 else 0

            # --- IDENTIFICATION METRICS (cloc) ---
            cloc_output_str = run_command(['cloc', '--json', '.'], temp_dir)
            cloc_output = json.loads(cloc_output_str) if cloc_output_str else {}
            cloc_output.pop('header', None)
            summary = cloc_output.pop('SUM', {})
            
            # --- NEW: Call the technical debt function ---
            tech_debt_ratio = calculate_technical_debt_ratio(temp_dir)
            
            # --- ASSEMBLE FINAL METADATA OBJECT ---
            metadata = {
                "projectName": repo_url.split('/')[-1].replace('.git', ''),
                "repositoryUrl": repo_url,
                "lastAnalysisDate": datetime.now().isoformat(),
                "identification": {
                    "languageBreakdown": cloc_output,
                    "totalFiles": summary.get('nFiles', 0),
                    "totalLinesOfCode": summary.get('code', 0),
                    "dependencyCount": get_dependency_count(temp_dir)
                },
                "activity": {
                    "lastCommitDate": last_commit_date,
                    "totalCommits": total_commits,
                    "contributorCount": contributor_count,
                    "commitFrequency": round(commit_frequency, 2),
                    "activeBranches": active_branches
                },
                "qualityHealth": {
                    "technicalDebtRatio": tech_debt_ratio, # <-- UPDATED VALUE
                    "codeIssues": {"critical": "N/A", "major": "N/A", "minor": "N/A"},
                    "codeCoverage": "N/A",
                    "cyclomaticComplexity": "N/A",
                    "duplicatedLines": "N/A"
                }
            }
            return jsonify(metadata), 200
            
        except Exception as e:
            error_message = f"An unexpected error occurred in the backend: {str(e)}"
            print(error_message)
            return jsonify({"error": error_message}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)