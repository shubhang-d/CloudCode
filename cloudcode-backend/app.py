import os
import subprocess
import tempfile
import json
import re
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

def run_command(command, working_dir):
    """Helper function to run a command and return its output. Returns an empty string on failure."""
    try:
        result = subprocess.run(
            command, cwd=working_dir, check=True, capture_output=True, text=True, encoding='utf-8', errors='ignore'
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"Warning: Command '{' '.join(command)}' failed. Stderr: {getattr(e, 'stderr', 'Command not found.')}")
        return "" # Return empty string on failure so downstream code can handle it

def get_dependency_count(repo_dir):
    """Safely parses common dependency files to count dependencies."""
    count = 0
    try:
        with open(os.path.join(repo_dir, 'package.json'), 'r', encoding='utf-8') as f:
            data = json.load(f)
            count += len(data.get('dependencies', {}))
            count += len(data.get('devDependencies', {}))
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    try:
        with open(os.path.join(repo_dir, 'requirements.txt'), 'r', encoding='utf-8') as f:
            lines = [line for line in f if line.strip() and not line.strip().startswith('#')]
            count += len(lines)
    except FileNotFoundError:
        pass
    return count

@app.route('/analyze', methods=['POST'])
def analyze_project():
    data = request.get_json()
    if not data or 'repositoryUrl' not in data:
        return jsonify({"error": "Missing 'repositoryUrl' in request body"}), 400

    repo_url = data['repositoryUrl']

    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            print(f"Cloning {repo_url} into {temp_dir}...")
            # We check the initial clone command for failure separately.
            subprocess.run(['git', 'clone', repo_url, '.'], cwd=temp_dir, check=True, capture_output=True)
            print("Clone successful.")

            # --- Safely gather all metrics ---
            last_commit_date = run_command(['git', 'log', '-1', '--format=%cd'], temp_dir) or "N/A"
            total_commits_str = run_command(['git', 'rev-list', '--all', '--count'], temp_dir)
            total_commits = int(total_commits_str) if total_commits_str.isdigit() else 0

            contributors_raw = run_command(['git', 'shortlog', '-s', '-n', '--all'], temp_dir)
            contributor_count = len(contributors_raw.splitlines()) if contributors_raw else 0

            active_branches_raw = run_command(['git', 'branch', '-r', '--no-merged'], temp_dir)
            active_branches = len(active_branches_raw.splitlines()) if active_branches_raw else 0

            # Safely calculate commit frequency
            commit_frequency = 0
            first_commit_ts_str = run_command(['git', 'rev-list', '--max-parents=0', 'HEAD', '--format=%ct'], temp_dir)
            last_commit_ts_str = run_command(['git', 'log', '-1', '--format=%ct'], temp_dir)

            if first_commit_ts_str and last_commit_ts_str:
                first_commit_unix_ts = int(first_commit_ts_str.splitlines()[-1])
                last_commit_unix_ts = int(last_commit_ts_str)
                project_age_seconds = last_commit_unix_ts - first_commit_unix_ts
                if project_age_seconds > 0:
                    project_age_months = project_age_seconds / (86400 * 30.44)
                    commit_frequency = total_commits / project_age_months if project_age_months > 0 else 0

            # CLOC Analysis
            cloc_output_json = run_command(['cloc', '--json', '.'], temp_dir)
            cloc_data = json.loads(cloc_output_json) if cloc_output_json else {}
            cloc_data.pop('header', None)
            summary = cloc_data.pop('SUM', {})

            # Dependency Count
            dependency_count = get_dependency_count(temp_dir)
            
            # Assemble the final metadata object
            metadata = {
                "projectName": repo_url.split('/')[-1].replace('.git', ''),
                "repositoryUrl": repo_url,
                "lastAnalysisDate": datetime.now().isoformat(),
                "identification": {
                    "languageBreakdown": cloc_data,
                    "totalFiles": summary.get('nFiles', 0),
                    "totalLinesOfCode": summary.get('code', 0),
                    "dependencyCount": dependency_count
                },
                "activity": {
                    "lastCommitDate": last_commit_date,
                    "totalCommits": total_commits,
                    "contributorCount": contributor_count,
                    "commitFrequency": round(commit_frequency, 2),
                    "activeBranches": active_branches,
                },
                "qualityHealth": {
                    "technicalDebtRatio": "N/A", "codeIssues": {"critical": "N/A", "major": "N/A", "minor": "N/A"},
                    "codeCoverage": "N/A", "cyclomaticComplexity": "N/A", "duplicatedLines": "N/A"
                }
            }

            return jsonify(metadata), 200

        except subprocess.CalledProcessError as e:
            # This will now catch the initial git clone failure
            return jsonify({"error": f"Failed to clone repository. Is the URL correct and public? Details: {e.stderr.strip()}"}), 500
        except Exception as e:
            # This is a catch-all for any other unexpected error during analysis
            error_message = f"An unexpected error occurred on the backend: {str(e)}"
            print(error_message) # Print to backend console for debugging
            return jsonify({"error": error_message}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)