"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const ProjectAnalysisProvider_1 = require("./ProjectAnalysisProvider");
const node_fetch_1 = __importDefault(require("node-fetch"));
const child_process_1 = require("child_process");
// --- NEW, SELF-CONTAINED LOCAL ANALYSIS LOGIC ---
// A simple map to identify languages by their file extension.
const LANGUAGE_MAP = {
    '.js': 'JavaScript', '.jsx': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.py': 'Python', '.java': 'Java', '.cs': 'C#', '.cpp': 'C++', '.h': 'C++',
    '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.json': 'JSON', '.md': 'Markdown',
    '.yml': 'YAML', '.yaml': 'YAML', '.xml': 'XML', '.gitignore': 'Ignore'
};
const EXCLUDE_DIRS = new Set(['node_modules', 'venv', '.venv', '.git', 'dist', 'out', 'build', '.vscode', '__pycache__']);
/**
 * Our custom, lightweight version of 'cloc'.
 * Traverses a directory, identifies known file types, and counts lines.
 * @param rootDir The starting directory for the analysis.
 * @returns A promise that resolves to an object similar to the cloc output.
 */
async function performLocalAnalysis(rootDir) {
    const stats = {};
    let totalFiles = 0;
    let totalLines = 0;
    async function traverse(currentPath) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            if (EXCLUDE_DIRS.has(entry.name)) {
                continue; // Skip excluded directories
            }
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                await traverse(fullPath);
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                const language = LANGUAGE_MAP[ext];
                if (language) {
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        const lineCount = content.split('\n').length;
                        if (!stats[language]) {
                            stats[language] = { nFiles: 0, code: 0 };
                        }
                        stats[language].nFiles++;
                        stats[language].code += lineCount;
                        totalFiles++;
                        totalLines += lineCount;
                    }
                    catch (readErr) {
                        console.warn(`Could not read file: ${fullPath}`, readErr);
                    }
                }
            }
        }
    }
    await traverse(rootDir);
    // Format the output to match what our TreeView expects
    stats['SUM'] = {
        nFiles: totalFiles,
        code: totalLines,
        comment: 0, // Not implemented for simplicity
        blank: 0 // Not implemented for simplicity
    };
    return stats;
}
function activate(context) {
    console.log('Congratulations, your extension "cloudcode" is now active!');
    const projectAnalysisProvider = new ProjectAnalysisProvider_1.ProjectAnalysisProvider();
    vscode.window.registerTreeDataProvider('cloudcode.projectsView', projectAnalysisProvider);
    // --- ANALYZE PROJECT COMMAND ---
    const analyzeProjectCommand = vscode.commands.registerCommand('cloudcode.analyzeProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder to analyze.');
            return;
        }
        const projectRoot = workspaceFolders[0].uri.fsPath;
        console.log(`Analyzing project at path: ${projectRoot}`);
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing Project...",
            cancellable: false
        }, async (progress) => {
            try {
                const isGitRepo = await isGitRepository(projectRoot);
                let metadata;
                if (isGitRepo) {
                    progress.report({ increment: 10, message: "Git repository detected. Finding remote URL..." });
                    const repoUrl = await getGitRemoteUrl(projectRoot);
                    if (!repoUrl) {
                        vscode.window.showWarningMessage("This is a Git repo, but no remote 'origin' was found. Performing local-only analysis.");
                        metadata = await analyzeLocalFolder(projectRoot, progress);
                    }
                    else {
                        metadata = await analyzeRemoteRepo(repoUrl, progress);
                    }
                }
                else {
                    vscode.window.showInformationMessage("This is not a Git repository. Performing local-only analysis.");
                    progress.report({ increment: 10, message: "Performing local-only analysis..." });
                    metadata = await analyzeLocalFolder(projectRoot, progress);
                }
                projectAnalysisProvider.refreshWithData(metadata);
                vscode.window.showInformationMessage(`Analysis of '${metadata.projectName}' complete!`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
                console.error(error);
            }
        });
    });
    // --- MODERNIZE CODE COMMAND (NEW) ---
    const modernizeCodeCommand = vscode.commands.registerCommand('cloudcode.modernizeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No active editor found.");
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText) {
            vscode.window.showInformationMessage("Please select a code snippet to modernize.");
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Modernizing Code...",
            cancellable: true
        }, async (progress, token) => {
            try {
                progress.report({ increment: 20, message: "Sending code to backend..." });
                const response = await (0, node_fetch_1.default)('http://127.0.0.1:5000/refactor/modernize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code_snippet: selectedText,
                        language: editor.document.languageId
                    })
                });
                if (token.isCancellationRequested) {
                    return;
                }
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from backend.' }));
                    throw new Error(errorData.error || `HTTP Error: ${response.status}`);
                }
                const data = await response.json();
                const modernizedCode = data.modernizedCode;
                progress.report({ increment: 80, message: "Applying changes..." });
                if (modernizedCode) {
                    editor.edit(editBuilder => {
                        editBuilder.replace(selection, modernizedCode);
                    });
                    vscode.window.showInformationMessage("Code modernized successfully!");
                }
                else {
                    throw new Error("Backend did not return modernized code.");
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to modernize code: ${error.message}`);
                console.error(error);
            }
        });
    });
    context.subscriptions.push(analyzeProjectCommand, modernizeCodeCommand);
}
async function analyzeLocalFolder(projectRoot, progress) {
    progress.report({ increment: 40, message: "Counting files and lines of code..." });
    const analysisResult = await performLocalAnalysis(projectRoot);
    progress.report({ increment: 90, message: "Assembling local report..." });
    const summary = analysisResult.SUM;
    delete analysisResult.SUM;
    const metadata = {
        projectName: path.basename(projectRoot) + " (Local)",
        repositoryUrl: "Local Folder",
        lastAnalysisDate: new Date().toISOString(),
        identification: {
            languageBreakdown: analysisResult,
            totalFiles: summary.nFiles,
            totalLinesOfCode: summary.code,
            dependencyCount: "N/A"
        },
        activity: {
            lastCommitDate: "N/A", totalCommits: "N/A", contributorCount: "N/A",
            commitFrequency: "N/A", activeBranches: "N/A",
        },
        qualityHealth: {
            technicalDebtRatio: "N/A", codeIssues: { critical: "N/A", major: "N/A", minor: "N/A" },
            codeCoverage: "N/A", cyclomaticComplexity: "N/A", duplicatedLines: "N/A"
        }
    };
    return metadata;
}
async function analyzeRemoteRepo(repoUrl, progress) {
    progress.report({ increment: 30, message: "Connecting to analysis backend..." });
    const response = await (0, node_fetch_1.default)('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryUrl: repoUrl })
    });
    progress.report({ increment: 80, message: "Processing backend data..." });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Received a non-JSON response from the server. Is it running correctly?" }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}
async function isGitRepository(directory) {
    try {
        const gitPath = path.join(directory, '.git');
        const stats = await fs.stat(gitPath);
        return stats.isDirectory();
    }
    catch (error) {
        return false;
    }
}
function getGitRemoteUrl(cwd) {
    return new Promise((resolve) => {
        (0, child_process_1.exec)('git config --get remote.origin.url', { cwd }, (err, stdout) => {
            if (err || !stdout) {
                console.warn("Could not get git remote URL:", err);
                resolve(null);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map