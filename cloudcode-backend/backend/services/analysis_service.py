# cloudcode_backend/services/analysis_service.py
import subprocess
import json
import os
from datetime import datetime
from ..utils.temp_dir import temporary_dir

def run_command(command, working_dir):
    """Executes a shell command and returns its output."""
    result = subprocess.run(command, cwd=working_dir, capture_output=True, text=True, check=True)
    return result.stdout.strip()

def analyze_git_repository(repo_url: str) -> dict:
    """
    Clones a Git repository and performs a comprehensive analysis.
    """
    with temporary_dir() as temp_dir:
        # 1. Clone the repository
        subprocess.run(['git', 'clone', '--depth=1', repo_url, '.'], cwd=temp_dir, check=True)

        # 2. Get project name
        project_name = os.path.basename(repo_url).replace('.git', '')

        # 3. Run cloc for language breakdown
        cloc_json_output = run_command(['cloc', '--json', '.'], temp_dir)
        cloc_data = json.loads(cloc_json_output)
        
        # Remove the header and summary for cleaner language data
        cloc_data.pop('header', None)
        summary = cloc_data.pop('SUM', {})

        # 4. Gather Git metadata
        last_commit_date = run_command(['git', 'log', '-1', '--format=%cI'], temp_dir)
        total_commits = run_command(['git', 'rev-list', '--count', 'HEAD'], temp_dir)
        contributor_count = len(run_command(['git', 'shortlog', '-s', '-n', '--all'], temp_dir).splitlines())
        active_branches = len(run_command(['git', 'branch', '-r'], temp_dir).splitlines())

        analysis_report = {
            "projectName": project_name,
            "repositoryUrl": repo_url,
            "lastAnalysisDate": datetime.now().isoformat(),
            "identification": {
                "languageBreakdown": cloc_data,
                "totalFiles": summary.get("nFiles", 0),
                "totalLinesOfCode": summary.get("code", 0),
                "dependencyCount": "N/A" # Placeholder
            },
            "activity": {
                "lastCommitDate": last_commit_date,
                "totalCommits": int(total_commits),
                "contributorCount": contributor_count,
                "commitFrequency": "N/A", # Placeholder
                "activeBranches": active_branches
            },
            "qualityHealth": { # Placeholders for future implementation
                "technicalDebtRatio": "N/A",
                "codeIssues": {"critical": "N/A", "major": "N/A", "minor": "N/A"},
                "codeCoverage": "N/A",
                "cyclomaticComplexity": "N/A",
                "duplicatedLines": "N/A"
            }
        }
        return analysis_report