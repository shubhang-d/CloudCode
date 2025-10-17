import os
import subprocess
import tempfile
import json
from flask import Flask, request, jsonify

# Initialize the Flask application
app = Flask(__name__)

def run_command(command, working_dir):
    """A helper function to run a command in a specific directory and return its output."""
    try:
        # Runs the command, captures stdout/stderr, and raises an error if the command fails.
        result = subprocess.run(
            command,
            cwd=working_dir,
            check=True,
            capture_output=True,
            text=True  # Ensure output is decoded as text
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # If the command returns a non-zero exit code, it's an error
        print(f"Error running command: {' '.join(command)}")
        print(f"Stderr: {e.stderr.strip()}")
        # We re-raise the exception to be caught by the main endpoint handler
        raise e
    except FileNotFoundError:
        # This happens if a command (like 'cloc' or 'git') is not installed
        print(f"Error: Command '{command[0]}' not found. Is it installed and in your PATH?")
        raise

@app.route('/analyze', methods=['POST'])
def analyze_project():
    """
    The main API endpoint. Expects a JSON payload with a 'repositoryUrl'.
    Clones the repo into a temporary directory, runs analysis, and returns JSON metadata.
    """
    data = request.get_json()
    if not data or 'repositoryUrl' not in data:
        return jsonify({"error": "Missing 'repositoryUrl' in request body"}), 400

    repo_url = data['repositoryUrl']

    # Use a temporary directory that is automatically cleaned up when we're done
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            print(f"Cloning {repo_url} into {temp_dir}...")
            # 1. CLONE THE REPOSITORY
            run_command(['git', 'clone', repo_url, '.'], temp_dir)
            print("Clone successful.")

            # --- GATHER METADATA USING COMMAND-LINE TOOLS ---

            # 2. GET COMMIT COUNT
            commit_count_str = run_command(['git', 'rev-list', '--all', '--count'], temp_dir)
            commit_count = int(commit_count_str)
            print(f"Found {commit_count} commits.")

            # 3. GET CONTRIBUTOR COUNT
            contributor_count_str = run_command(['git', 'shortlog', '-s', '-n', '--all'], temp_dir)
            # Each line is a contributor, so we count the lines
            contributor_count = len(contributor_count_str.splitlines())
            print(f"Found {contributor_count} contributors.")

            # 4. RUN CLOC FOR LANGUAGE BREAKDOWN AND FILE COUNTS
            # The --json flag is amazing, it gives us structured data directly
            cloc_output_json = run_command(['cloc', '--json', '.'], temp_dir)
            cloc_data = json.loads(cloc_output_json)
            print("cloc analysis successful.")

            # --- ASSEMBLE THE FINAL METADATA OBJECT ---
            # We remove the 'header' from cloc data as it's not needed
            cloc_data.pop('header', None)
            
            # The 'SUM' key from cloc gives us totals for files and lines of code
            summary = cloc_data.pop('SUM', {})

            metadata = {
                "projectName": repo_url.split('/')[-1].replace('.git', ''),
                "repositoryUrl": repo_url,
                "identification": {
                    "languageBreakdown": cloc_data,
                    "totalFiles": summary.get('nFiles', 0),
                    "totalLinesOfCode": summary.get('code', 0),
                    "totalCommentLines": summary.get('comment', 0),
                    "totalBlankLines": summary.get('blank', 0),
                },
                "activity": {
                    "totalCommits": commit_count,
                    "contributorCount": contributor_count,
                },
                # Placeholder for future quality metrics
                "qualityHealth": {
                    "technicalDebtRatio": "N/A",
                    "codeIssues": {},
                }
            }

            return jsonify(metadata), 200

        except subprocess.CalledProcessError:
            return jsonify({"error": "Failed to analyze repository. Check if the URL is correct and public."}), 500
        except FileNotFoundError:
            return jsonify({"error": "A required command-line tool (like git or cloc) is not installed on the server."}), 500
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return jsonify({"error": "An internal server error occurred."}), 500

if __name__ == '__main__':
    # Runs the app in debug mode for development
    app.run(debug=True, port=5000)