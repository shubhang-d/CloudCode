# cloudcode-backend/app.py

import os
import subprocess
import tempfile
import json
<<<<<<< HEAD
import re
=======
>>>>>>> c22b0a9d050c01e5137c1efdd0ec73718a3d2e4c
from datetime import datetime
from flask import Flask, request, jsonify
import sys

# Import radon for code analysis
from radon.metrics import mi_visit
from radon.visitors import ComplexityVisitor
from radon.cli.tools import iter_filenames

app = Flask(__name__)

<<<<<<< HEAD
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
=======
def run_command(command, working_dir, check=True):
    """
    Runs a shell command in a specified directory and returns its output.
    Returns None if the command fails and check is True.
    """
    try:
        result = subprocess.run(
            command,
            cwd=working_dir,
            check=check,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"Error running command: {' '.join(command)}. Error: {e}")
        return None

def get_dependency_count(repo_dir):
    """Counts dependencies from common package manager files."""
    # (This function is unchanged)
>>>>>>> c22b0a9d050c01e5137c1efdd0ec73718a3d2e4c
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
<<<<<<< HEAD
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
=======
            count += len([line for line in f if line.strip() and not line.strip().startswith('#')])
    except FileNotFoundError:
        pass
    return count

def calculate_technical_debt_ratio(repo_dir):
    """Calculates a technical debt ratio based on the average Maintainability Index."""
    # (This function is unchanged)
    total_mi_score = 0
    file_count = 0
    exclude_patterns = "*/node_modules/*,*/venv/*,*/.git/*,*/dist/*,*/build/*"
    supported_files = list(iter_filenames([repo_dir], exclude=exclude_patterns))
    for filepath in supported_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                code = f.read()
                mi = mi_visit(code, multi=True)
                if mi > 0:
                    total_mi_score += mi
                    file_count += 1
        except Exception: pass
    if file_count == 0: return "N/A"
    average_mi = total_mi_score / file_count
    debt_ratio = 100 - average_mi
    return f"{debt_ratio:.2f}%"

def calculate_average_complexity(repo_dir):
    """Calculates the average Cyclomatic Complexity per function/method."""
    # (This function is unchanged)
    total_complexity, function_count = 0, 0
    exclude_patterns = "*/node_modules/*,*/venv/*,*/.git/*,*/dist/*,*/build/*"
    supported_files = list(iter_filenames([repo_dir], exclude=exclude_patterns))
    for filepath in supported_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                code = f.read()
                visitor = ComplexityVisitor.from_code(code)
                for function in visitor.functions:
                    total_complexity += function.complexity
                    function_count += 1
        except Exception: pass
    if function_count == 0: return "N/A"
    average_complexity = total_complexity / function_count
    return f"{average_complexity:.2f}"

# --- NEW FUNCTION TO SCAN FOR VULNERABILITIES (PART 3) ---
def analyze_vulnerabilities(repo_dir):
    """
    Scans for vulnerabilities in package.json and requirements.txt and
    returns a dictionary of issue counts by severity.
    """
    issues = {"critical": 0, "major": 0, "minor": 0}

    # --- Scan Node.js dependencies ---
    if os.path.exists(os.path.join(repo_dir, 'package.json')):
        print("Found package.json, running npm audit...")
        # Install dependencies first, but don't fail the whole analysis if it breaks
        run_command(['npm', 'install', '--omit=dev', '--legacy-peer-deps'], repo_dir, check=False)
        # Run audit, allow it to fail (returns non-zero exit code if vulns are found)
        audit_output = run_command(['npm', 'audit', '--json'], repo_dir, check=False)
        if audit_output:
            try:
                audit_data = json.loads(audit_output)
                summary = audit_data.get('summary', {})
                issues['critical'] += summary.get('critical', 0)
                issues['major'] += summary.get('high', 0) # Mapping 'high' from npm to 'major'
                issues['minor'] += summary.get('moderate', 0) + summary.get('low', 0)
            except json.JSONDecodeError:
                print("Could not parse npm audit JSON output.")

    # --- Scan Python dependencies ---
    if os.path.exists(os.path.join(repo_dir, 'requirements.txt')):
        print("Found requirements.txt, running safety check...")
        # Create a temporary virtual environment to not pollute the main one
        temp_venv_path = os.path.join(repo_dir, "temp_venv_for_scan")
        python_executable = sys.executable
        run_command([python_executable, '-m', 'venv', temp_venv_path], repo_dir)
        
        pip_path = os.path.join(temp_venv_path, 'bin', 'pip')
        safety_path = os.path.join(temp_venv_path, 'bin', 'safety')

        # Install dependencies into the temporary venv
        run_command([pip_path, 'install', '-r', 'requirements.txt'], repo_dir, check=False)
        # Run safety check
        safety_output = run_command([safety_path, 'check', '--json'], repo_dir, check=False)
        if safety_output:
            try:
                safety_data = json.loads(safety_output)
                # For simplicity, we'll classify all Python vulns as 'major' for now
                issues['major'] += len(safety_data)
            except json.JSONDecodeError:
                print("Could not parse safety check JSON output.")

    return issues


@app.route('/analyze', methods=['POST'])
def analyze_project():
    repo_url = request.get_json().get('repositoryUrl')
    if not repo_url:
        return jsonify({"error": "Missing 'repositoryUrl'"}), 400

    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            run_command(['git', 'clone', '--depth=100', repo_url, '.'], temp_dir)
            
            # (Git and cloc metrics gathering remains the same)
            last_commit_date = run_command(['git', 'log', '-1', '--format=%cd'], temp_dir)
            total_commits_str = run_command(['git', 'rev-list', '--all', '--count'], temp_dir)
            total_commits = int(total_commits_str) if total_commits_str else 0
            # ... (other git commands are the same) ...
            contributor_count_str = run_command(['git', 'shortlog', '-s', '-n', '--all'], temp_dir)
            contributor_count = len(contributor_count_str.splitlines()) if contributor_count_str else 0
            active_branches_str = run_command(['git', 'branch', '-r'], temp_dir)
            active_branches = len(active_branches_str.splitlines()) if active_branches_str else 0
            
            first_commit_unix_ts_str = run_command(['git', 'rev-list', '--max-parents=0', 'HEAD', '--format=%ct'], temp_dir)
            last_commit_unix_ts_str = run_command(['git', 'log', '-1', '--format=%ct'], temp_dir)
            commit_frequency = 0
            if first_commit_unix_ts_str and last_commit_unix_ts_str:
                first_commit_unix_ts = int(first_commit_unix_ts_str.splitlines()[-1])
                last_commit_unix_ts = int(last_commit_unix_ts_str)
>>>>>>> c22b0a9d050c01e5137c1efdd0ec73718a3d2e4c
                project_age_seconds = last_commit_unix_ts - first_commit_unix_ts
                if project_age_seconds > 0:
                    project_age_months = project_age_seconds / (86400 * 30.44)
                    commit_frequency = total_commits / project_age_months if project_age_months > 0 else 0
<<<<<<< HEAD

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
=======

            cloc_output_str = run_command(['cloc', '--json', '.'], temp_dir)
            cloc_output = json.loads(cloc_output_str) if cloc_output_str else {}
            cloc_output.pop('header', None)
            summary = cloc_output.pop('SUM', {})

            # --- Call all quality health functions ---
            tech_debt_ratio = calculate_technical_debt_ratio(temp_dir)
            avg_complexity = calculate_average_complexity(temp_dir)
            code_issues = analyze_vulnerabilities(temp_dir) # <-- NEW CALL

            # --- ASSEMBLE FINAL METADATA OBJECT ---
            metadata = {
                "projectName": repo_url.split('/')[-1].replace('.git', ''),
                "repositoryUrl": repo_url, "lastAnalysisDate": datetime.now().isoformat(),
                "identification": {"languageBreakdown": cloc_output, "totalFiles": summary.get('nFiles', 0), "totalLinesOfCode": summary.get('code', 0), "dependencyCount": get_dependency_count(temp_dir)},
                "activity": {"lastCommitDate": last_commit_date, "totalCommits": total_commits, "contributorCount": contributor_count, "commitFrequency": round(commit_frequency, 2), "activeBranches": active_branches},
                "qualityHealth": {
                    "technicalDebtRatio": tech_debt_ratio,
                    "codeIssues": code_issues, # <-- UPDATED VALUE
                    "codeCoverage": "N/A",
                    "cyclomaticComplexity": avg_complexity,
                    "duplicatedLines": "N/A"
>>>>>>> c22b0a9d050c01e5137c1efdd0ec73718a3d2e4c
                }
            }
            return jsonify(metadata), 200
<<<<<<< HEAD

        except subprocess.CalledProcessError as e:
            # This will now catch the initial git clone failure
            return jsonify({"error": f"Failed to clone repository. Is the URL correct and public? Details: {e.stderr.strip()}"}), 500
        except Exception as e:
            # This is a catch-all for any other unexpected error during analysis
            error_message = f"An unexpected error occurred on the backend: {str(e)}"
            print(error_message) # Print to backend console for debugging
=======
            
        except Exception as e:
            error_message = f"An unexpected error occurred in the backend: {str(e)}"
            print(error_message)
>>>>>>> c22b0a9d050c01e5137c1efdd0ec73718a3d2e4c
            return jsonify({"error": error_message}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)