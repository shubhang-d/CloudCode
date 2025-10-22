# cloudcode-backend/app.py

import os
import subprocess
import tempfile
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
from dotenv import load_dotenv
import google.generativeai as genai

# Import radon for code analysis (used in /analyze endpoint)
from radon.metrics import mi_visit
from radon.visitors import ComplexityVisitor
from radon.cli.tools import iter_filenames

# --- SETUP AND CONFIGURATION ---

# Load environment variables from a .env file (for GOOGLE_API_KEY)
load_dotenv()

# Configure the Gemini API client.
# TODO: Make sure you have GOOGLE_API_KEY="your_key_here" in your .env file
# and uncomment the line below.
# genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Initialize the Flask application
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) for all routes,
# which is essential for the VS Code webview to communicate with this server.
CORS(app)


# --- CORE AI-DRIVEN FUNCTIONS ---

def call_gemini_for_modernization(code_snippet, language):
    """Calls the Gemini API to modernize the given code snippet."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("WARNING: GOOGLE_API_KEY not found. Using simulated modernization response.")
        return f"/* Simulated modernization for {language}. Please configure your API key. */\n{code_snippet}"
    
    # --- REAL GEMINI API CALL LOGIC ---
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
        print(f"Error calling Gemini API for modernization: {e}")
        return f"// Error during modernization: {e}"

def call_gemini_for_explanation(code_snippet):
    """Calls the Gemini API to explain the given code snippet."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("WARNING: GOOGLE_API_KEY not found. Using simulated explanation response.")
        return "# Simulated Explanation\nThis is a **simulated explanation** because the `GOOGLE_API_KEY` was not found."

    # --- REAL GEMINI API CALL LOGIC ---
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = (
            "You are an expert programmer acting as a helpful code assistant. "
            "Please provide a clear, concise explanation for the following code snippet. "
            "Structure your explanation using Markdown. Use headings for different sections "
            "(like '## Purpose', '### Key Logic', etc.), use bullet points for lists, and "
            "use triple backticks for code blocks and single backticks for inline code."
        )
        response = model.generate_content([prompt, code_snippet])
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API for explanation: {e}")
        return f"An error occurred while trying to generate an explanation: {e}"

def analyze_code_batch_with_gemini(code_batch):
    """Sends a batch of code to Gemini for vulnerability analysis. GUARANTEES a list is returned."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("WARNING: GOOGLE_API_KEY not found. Using simulated security scan response.")
        if "app.py" in code_batch and "request.get_json()" in code_batch:
            return [{
                "file_path": "cloudcode-backend/app.py",
                "line_number": 20, "vulnerability_type": "Simulated: Potential XSS",
                "description": "User input from a request is used without sanitization.",
                "suggested_solution": "Use a library to escape any user-provided data."
            }]
        return []

    # --- REAL GEMINI API CALL LOGIC ---
    try:
        model = genai.GenerativeModel('gemini-2.5-pro')
        prompt = (
            "You are a senior security engineer performing a complete code review. "
            "The following text contains source code from a project, with each file's content "
            "prefixed by a line like '--- FILE: path/to/file.js ---'.\n"
            "Analyze the provided code for security vulnerabilities. Look for issues like "
            "SQL Injection, Cross-Site Scripting (XSS), Insecure Deserialization, Command Injection, "
            "Hardcoded Secrets, Improper Error Handling, and other common weaknesses (OWASP Top 10).\n"
            "Return your findings as a JSON list of objects. Each object must have the following keys:\n"
            "- 'file_path' (string): The full path of the file, extracted exactly from the '--- FILE: ... ---' marker.\n"
            "- 'line_number' (integer): The line number of the vulnerability *relative to the start of its file*.\n"
            "- 'vulnerability_type' (string): A concise name for the vulnerability (e.g., 'SQL Injection').\n"
            "- 'description' (string): A clear explanation of the vulnerability and why it is a risk.\n"
            "- 'suggested_solution' (string): A specific, actionable recommendation to fix the code.\n"
            "If no vulnerabilities are found, you MUST return an empty JSON list: []."
        )
        response = model.generate_content([prompt, code_batch])
        json_text = response.text.strip().replace('```json', '').replace('```', '')
        vulnerabilities = json.loads(json_text)
        return vulnerabilities
    except Exception as e:
        print(f"Error analyzing code batch with Gemini: {e}")
        return [{
            "file_path": "Analysis Error", "line_number": 1,
            "vulnerability_type": "AI Analysis Failed",
            "description": f"The AI model failed to process a batch. Error: {str(e)}",
            "suggested_solution": "This could be due to the batch size, content policies, or a temporary API issue. The scan will continue with other batches."
        }]


# --- API ENDPOINTS ---

@app.route('/security/scan', methods=['POST'])
def security_scan():
    """Receives a batch of code from the workspace and scans it for vulnerabilities."""
    data = request.get_json()
    code_batch = data.get('code_batch')
    if not code_batch:
        return jsonify({"error": "Missing 'code_batch' in request body"}), 400

    try:
        print(f"Received code batch for analysis (size: {len(code_batch)} chars)...")
        vulnerabilities = analyze_code_batch_with_gemini(code_batch)
        print(f"Batch analysis complete. Found {len(vulnerabilities)} potential issues in this batch.")
        return jsonify(vulnerabilities), 200
    except Exception as e:
        error_message = f"An unexpected error occurred on the backend during the scan: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message}), 500

@app.route('/refactor/modernize', methods=['POST'])
def modernize_code():
    """Receives a code snippet and returns a modernized version."""
    data = request.get_json()
    code_snippet = data.get('code_snippet')
    language = data.get('language', 'unknown')
    if not code_snippet:
        return jsonify({"error": "Missing 'code_snippet' in request"}), 400
    modernized_code = call_gemini_for_modernization(code_snippet, language)
    return jsonify({"modernizedCode": modernized_code}), 200

@app.route('/explain-code', methods=['POST'])
def explain_code():
    """Receives a code snippet and returns a Markdown explanation."""
    data = request.get_json()
    code_snippet = data.get('code_snippet')
    if not code_snippet:
        return jsonify({"error": "Missing 'code_snippet' in request"}), 400
    explanation = call_gemini_for_explanation(code_snippet)
    return jsonify({"explanation": explanation}), 200

@app.route('/analyze', methods=['POST'])
def analyze_project():
    """Receives a Git repository URL and performs a comprehensive analysis."""
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


# --- HELPER FUNCTIONS FOR /analyze ENDPOINT ---

def run_command(command, working_dir, check=True):
    """Runs a shell command and returns its output."""
    try:
        result = subprocess.run(command, cwd=working_dir, check=check, capture_output=True, text=True, encoding='utf-8')
        return result.stdout.strip()
    except Exception as e:
        print(f"Error running command: {' '.join(command)}. Error: {e}")
        return None

def get_dependency_count(repo_dir):
    """Counts dependencies from common package manager files."""
    count = 0
    package_json_path = os.path.join(repo_dir, 'package.json')
    requirements_txt_path = os.path.join(repo_dir, 'requirements.txt')
    if os.path.exists(package_json_path):
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                count += len(data.get('dependencies', {}))
                count += len(data.get('devDependencies', {}))
        except (json.JSONDecodeError): pass
    if os.path.exists(requirements_txt_path):
        try:
            with open(requirements_txt_path, 'r', encoding='utf-8') as f:
                count += len([line for line in f if line.strip() and not line.strip().startswith('#')])
        except Exception: pass
    return count

def calculate_technical_debt_ratio(repo_dir):
    """Calculates a technical debt ratio using Radon's Maintainability Index."""
    total_mi_score, file_count = 0, 0
    exclude_patterns = "*/node_modules/*,*/venv/*,*/.git/*,*/dist/*,*/build/*"
    try:
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
        return f"{(100 - average_mi):.2f}%"
    except Exception:
        return "N/A"

def calculate_average_complexity(repo_dir):
    """Calculates the average Cyclomatic Complexity per function/method."""
    total_complexity, function_count = 0, 0
    exclude_patterns = "*/node_modules/*,*/venv/*,*/.git/*,*/dist/*,*/build/*"
    try:
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
        return f"{(total_complexity / function_count):.2f}"
    except Exception:
        return "N/A"

def analyze_vulnerabilities(repo_dir):
    """Scans for vulnerabilities in dependency files."""
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
            except json.JSONDecodeError: print("Could not parse npm audit JSON output.")
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
            except json.JSONDecodeError: print("Could not parse safety check JSON output.")
    return issues


if __name__ == '__main__':
    app.run(debug=True, port=5000)