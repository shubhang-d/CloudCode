# cloudcode-backend/app.py

import os
import subprocess
import tempfile
import json
from datetime import datetime
from flask import Flask, request, jsonify
import sys
from dotenv import load_dotenv
import google.generativeai as genai

# Import radon for code analysis
from radon.metrics import mi_visit
from radon.visitors import ComplexityVisitor
from radon.cli.tools import iter_filenames

# --- GEMINI API SETUP (NEW) ---
# Load environment variables from a .env file
load_dotenv()
# TODO: Add your Gemini API Key to a .env file in this directory
# e.g., GOOGLE_API_KEY="your_api_key_here"
# genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

app = Flask(__name__)

# --- NEW FUNCTION TO CALL THE LLM FOR REFACTORING ---
def call_gemini_for_modernization(code_snippet, language):
    """
    Calls the Gemini API to modernize the given code snippet.
    
    THIS IS A PLACEHOLDER. Replace the logic here with the actual API call.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        # If no API key is set, return a hardcoded, simulated response for demonstration.
        print("WARNING: GOOGLE_API_KEY not found. Using simulated modernization response.")
        if language == 'javascript':
            # Example: Modernizing old JavaScript
            if "var" in code_snippet and "function" in code_snippet:
                return "const modernizedFunction = async () => {\n  // Modernized logic here...\n  // Using let/const and async/await\n};"
        return f"/* Simulated modernization for {language}. Please configure your API key. */\n{code_snippet}"

    # --- THIS IS THE REAL GEMINI API CALL LOGIC ---
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = (
            f"You are an expert programmer. Please modernize the following {language} code snippet. "
            "Update it to use the latest syntax, idioms, and best practices. "
            "Only return the modernized code itself, without any explanations, comments, or markdown formatting."
        )
        
        response = model.generate_content([prompt, code_snippet])
        return response.text
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return f"// Error during modernization: {e}"
    # --- END OF REAL GEMINI LOGIC ---

# --- NEW ENDPOINT FOR REFACTORING (NEW) ---
@app.route('/refactor/modernize', methods=['POST'])
def modernize_code():
    data = request.get_json()
    code_snippet = data.get('code_snippet')
    language = data.get('language', 'unknown') # Default to 'unknown' if not provided

    if not code_snippet:
        return jsonify({"error": "Missing 'code_snippet' in request"}), 400

    modernized_code = call_gemini_for_modernization(code_snippet, language)
    
    return jsonify({"modernizedCode": modernized_code}), 200


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
            count += len([line for line in f if line.strip() and not line.strip().startswith('#')])
    except FileNotFoundError:
        pass
    return count

def calculate_technical_debt_ratio(repo_dir):
    """Calculates a technical debt ratio based on the average Maintainability Index."""
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

def analyze_vulnerabilities(repo_dir):
    """
    Scans for vulnerabilities in package.json and requirements.txt and
    returns a dictionary of issue counts by severity.
    """
    issues = {"critical": 0, "major": 0, "minor": 0}

    if os.path.exists(os.path.join(repo_dir, 'package.json')):
        print("Found package.json, running npm audit...")
        run_command(['npm', 'install', '--omit=dev', '--legacy-peer-deps'], repo_dir, check=False)
        audit_output = run_command(['npm', 'audit', '--json'], repo_dir, check=False)
        if audit_output:
            try:
                audit_data = json.loads(audit_output)
                summary = audit_data.get('summary', {})
                issues['critical'] += summary.get('critical', 0)
                issues['major'] += summary.get('high', 0)
                issues['minor'] += summary.get('moderate', 0) + summary.get('low', 0)
            except json.JSONDecodeError:
                print("Could not parse npm audit JSON output.")

    if os.path.exists(os.path.join(repo_dir, 'requirements.txt')):
        print("Found requirements.txt, running safety check...")
        temp_venv_path = os.path.join(repo_dir, "temp_venv_for_scan")
        python_executable = sys.executable
        run_command([python_executable, '-m', 'venv', temp_venv_path], repo_dir)
        
        pip_path = os.path.join(temp_venv_path, 'bin', 'pip')
        safety_path = os.path.join(temp_venv_path, 'bin', 'safety')

        run_command([pip_path, 'install', '-r', 'requirements.txt'], repo_dir, check=False)
        safety_output = run_command([safety_path, 'check', '--json'], repo_dir, check=False)
        if safety_output:
            try:
                safety_data = json.loads(safety_output)
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
            
            last_commit_date = run_command(['git', 'log', '-1', '--format=%cd'], temp_dir)
            total_commits_str = run_command(['git', 'rev-list', '--all', '--count'], temp_dir)
            total_commits = int(total_commits_str) if total_commits_str else 0
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
                project_age_seconds = last_commit_unix_ts - first_commit_unix_ts
                if project_age_seconds > 0:
                    project_age_months = project_age_seconds / (86400 * 30.44)
                    commit_frequency = total_commits / project_age_months if project_age_months > 0 else 0

            cloc_output_str = run_command(['cloc', '--json', '.'], temp_dir)
            cloc_output = json.loads(cloc_output_str) if cloc_output_str else {}
            cloc_output.pop('header', None)
            summary = cloc_output.pop('SUM', {})

            tech_debt_ratio = calculate_technical_debt_ratio(temp_dir)
            avg_complexity = calculate_average_complexity(temp_dir)
            code_issues = analyze_vulnerabilities(temp_dir)

            metadata = {
                "projectName": repo_url.split('/')[-1].replace('.git', ''),
                "repositoryUrl": repo_url, "lastAnalysisDate": datetime.now().isoformat(),
                "identification": {"languageBreakdown": cloc_output, "totalFiles": summary.get('nFiles', 0), "totalLinesOfCode": summary.get('code', 0), "dependencyCount": get_dependency_count(temp_dir)},
                "activity": {"lastCommitDate": last_commit_date, "totalCommits": total_commits, "contributorCount": contributor_count, "commitFrequency": round(commit_frequency, 2), "activeBranches": active_branches},
                "qualityHealth": {
                    "technicalDebtRatio": tech_debt_ratio,
                    "codeIssues": code_issues,
                    "codeCoverage": "N/A",
                    "cyclomaticComplexity": avg_complexity,
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