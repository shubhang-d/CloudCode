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
const ExplainViewProvider_1 = require("./ExplainViewProvider");
const VulnerabilityProvider_1 = require("./VulnerabilityProvider");
const node_fetch_1 = __importDefault(require("node-fetch"));
const child_process_1 = require("child_process");
// --- CONSTANTS FOR FILE SCANNING AND BATCHING ---
// For the 'Analyze Project' feature (local-only mode)
const LANGUAGE_MAP_ANALYZE = {
    '.js': 'JavaScript', '.jsx': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.py': 'Python', '.java': 'Java', '.cs': 'C#', '.cpp': 'C++', '.h': 'C++',
    '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.json': 'JSON', '.md': 'Markdown',
    '.yml': 'YAML', '.yaml': 'YAML', '.xml': 'XML', '.gitignore': 'Ignore'
};
const EXCLUDE_DIRS_ANALYZE = new Set(['node_modules', 'venv', '.venv', '.git', 'dist', 'out', 'build', '.vscode', '__pycache__']);
// For the 'Security Scan' feature
const SCANNABLE_EXTENSIONS_SCAN = new Set(['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.cs', '.php', '.rb', '.html']);
const EXCLUDE_DIRS_SCAN = new Set(['node_modules', 'venv', '.venv', '.git', 'dist', 'out', 'build', '.vscode', '__pycache__', 'target', 'bin']);
// A conservative estimation: 1 token is roughly 4 characters.
// We'll aim for batches under a safe limit to avoid exceeding the model's context window.
const CHAR_TO_TOKEN_RATIO = 4;
const SAFE_TOKEN_LIMIT = 100000;
const SAFE_CHAR_LIMIT = SAFE_TOKEN_LIMIT * CHAR_TO_TOKEN_RATIO;
// --- HELPER FUNCTIONS ---
/**
 * Creates manageable batches of project code to send to the AI for security analysis,
 * respecting the model's token limits.
 * @param rootDir The root directory of the project to scan.
 * @returns A promise that resolves to an array of strings, where each string is a batch of code.
 */
async function createCodeBatches(rootDir) {
    const allFiles = [];
    // Step 1: Traverse filesystem to get all scannable file contents
    async function collectFiles(currentPath) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (EXCLUDE_DIRS_SCAN.has(entry.name)) {
                    continue; // This correctly skips excluded directories
                }
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isDirectory()) {
                    await collectFiles(fullPath);
                }
                else if (entry.isFile() && SCANNABLE_EXTENSIONS_SCAN.has(path.extname(entry.name))) {
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        allFiles.push({
                            path: path.relative(rootDir, fullPath),
                            content: content
                        });
                    }
                    catch (err) {
                        console.warn(`Could not read file ${fullPath}, skipping.`);
                    }
                }
            }
        }
        catch (err) {
            console.error(`Could not read directory ${currentPath}`);
        }
    }
    await collectFiles(rootDir);
    // Step 2: Group files into batches, ensuring each batch is under the safe character limit
    const batches = [];
    let currentBatchContent = '';
    let currentBatchCharCount = 0;
    for (const file of allFiles) {
        const fileHeader = `--- FILE: ${file.path} ---\n`;
        const fileBlock = `${fileHeader}${file.content}\n\n`;
        const fileBlockCharCount = fileBlock.length;
        if (fileBlockCharCount > SAFE_CHAR_LIMIT) {
            console.warn(`Skipping file ${file.path} as it exceeds the safe token limit by itself.`);
            continue;
        }
        if (currentBatchCharCount + fileBlockCharCount > SAFE_CHAR_LIMIT) {
            batches.push(currentBatchContent);
            currentBatchContent = fileBlock;
            currentBatchCharCount = fileBlockCharCount;
        }
        else {
            currentBatchContent += fileBlock;
            currentBatchCharCount += fileBlockCharCount;
        }
    }
    if (currentBatchContent.length > 0) {
        batches.push(currentBatchContent);
    }
    return batches;
}
/**
 * The main activation function for the extension.
 * This is called once when the extension is first activated.
 */
function activate(context) {
    console.log('Congratulations, your extension "cloudcode" is now active!');
    // --- REGISTER ALL SIDEBAR PROVIDERS ---
    const projectAnalysisProvider = new ProjectAnalysisProvider_1.ProjectAnalysisProvider();
    const explainProvider = new ExplainViewProvider_1.ExplainViewProvider(context.extensionUri);
    const vulnerabilityProvider = new VulnerabilityProvider_1.VulnerabilityProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider('cloudcode.projectsView', projectAnalysisProvider), vscode.window.registerWebviewViewProvider(ExplainViewProvider_1.ExplainViewProvider.viewType, explainProvider), vscode.window.registerTreeDataProvider('cloudcode.vulnerabilitiesView', vulnerabilityProvider));
    // --- REGISTER EVENT LISTENERS ---
    // Automatically populates the "Explain Code" view when text is selected in the editor
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
        if (!e.textEditor.selection.isEmpty) {
            const selectedText = e.textEditor.document.getText(e.textEditor.selection);
            explainProvider.populateFromSelection(selectedText);
        }
    }));
    // --- REGISTER ALL COMMANDS ---
    // COMMAND: Analyze Project
    const analyzeProjectCommand = vscode.commands.registerCommand('cloudcode.analyzeProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder to analyze.');
            return;
        }
        const projectRoot = workspaceFolders[0].uri.fsPath;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing Project...",
            cancellable: false
        }, async (progress) => {
            try {
                let metadata;
                const isGitRepo = await isGitRepository(projectRoot);
                if (isGitRepo) {
                    const repoUrl = await getGitRemoteUrl(projectRoot);
                    if (repoUrl) {
                        metadata = await analyzeRemoteRepo(repoUrl, progress);
                    }
                    else {
                        vscode.window.showWarningMessage("Git repo found, but no remote 'origin' was detected. Performing local-only analysis.");
                        metadata = await analyzeLocalFolder(projectRoot, progress);
                    }
                }
                else {
                    vscode.window.showInformationMessage("This is not a Git repository. Performing local-only analysis.");
                    metadata = await analyzeLocalFolder(projectRoot, progress);
                }
                projectAnalysisProvider.refreshWithData(metadata);
                vscode.window.showInformationMessage(`Analysis of '${metadata.projectName}' complete!`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
            }
        });
    });
    // COMMAND: Modernize Selection
    const modernizeCodeCommand = vscode.commands.registerCommand('cloudcode.modernizeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText) {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Modernizing Code...",
            cancellable: true
        }, async (progress, token) => {
            try {
                const response = await (0, node_fetch_1.default)('http://127.0.0.1:5000/refactor/modernize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code_snippet: selectedText, language: editor.document.languageId })
                });
                if (token.isCancellationRequested) {
                    return;
                }
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
                    throw new Error(errorData.error);
                }
                const data = await response.json();
                editor.edit(editBuilder => {
                    editBuilder.replace(selection, data.modernizedCode);
                });
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to modernize code: ${error.message}`);
            }
        });
    });
    // ==================================================================
    // START: DOCUMENTATION GENERATION COMMAND (NEW)
    // ==================================================================
    const generateDocsCommand = vscode.commands.registerCommand('cloudcode.generateDocs', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText || selection.isEmpty) {
            vscode.window.showWarningMessage('Please select a function or code block to document.');
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating documentation with AI...",
            cancellable: true
        }, async (progress, token) => {
            try {
                progress.report({ increment: 30, message: "Sending code to backend..." });
                // Send the selected text to the /generate-docs endpoint
                const response = await (0, node_fetch_1.default)('http://127.0.0.1:5000/generate-docs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: selectedText, language: editor.document.languageId })
                });
                if (token.isCancellationRequested) {
                    return;
                }
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
                    throw new Error(errorData.error || `HTTP Error: ${response.status}`);
                }
                const data = await response.json();
                progress.report({ increment: 90, message: "Inserting documentation..." });
                // Insert the returned documentation above the selected code
                editor.edit(editBuilder => {
                    const firstLine = editor.document.lineAt(selection.start.line);
                    const indentation = firstLine.text.substring(0, firstLine.firstNonWhitespaceCharacterIndex);
                    // Indent each line of the docstring to match the code's indentation level
                    const indentedDocs = data.documentation.split('\n').join('\n' + indentation);
                    editBuilder.insert(selection.start, indentedDocs + '\n' + indentation);
                });
                vscode.window.showInformationMessage('AI documentation has been inserted.');
            }
            catch (error) {
                if (token.isCancellationRequested) {
                    return;
                }
                vscode.window.showErrorMessage(`Documentation generation failed: ${error.message}`);
                console.error(error);
            }
        });
    });
    // ==================================================================
    // END: DOCUMENTATION GENERATION COMMAND
    // ==================================================================
    // COMMAND: Scan for Security Vulnerabilities
    const scanForVulnerabilitiesCommand = vscode.commands.registerCommand('cloudcode.scanForVulnerabilities', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder to scan.');
            return;
        }
        const projectRoot = workspaceFolders[0].uri.fsPath;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Scanning Project for Vulnerabilities...",
            cancellable: true
        }, async (progress, token) => {
            try {
                // Step 1: Clear previous results from the UI
                vulnerabilityProvider.clear();
                progress.report({ message: "Preparing code batches...", increment: 5 });
                const codeBatches = await createCodeBatches(projectRoot);
                if (token.isCancellationRequested) {
                    return;
                }
                if (codeBatches.length === 0) {
                    vscode.window.showInformationMessage("No scannable files found in the project.");
                    vulnerabilityProvider.setScanComplete(); // Mark as complete to show "not found"
                    return;
                }
                let totalVulnerabilitiesFound = 0;
                const totalBatches = codeBatches.length;
                // Step 2: Loop through each batch and update the UI in real-time
                for (let i = 0; i < totalBatches; i++) {
                    const batch = codeBatches[i];
                    const progressIncrement = (1 / totalBatches) * 90;
                    progress.report({
                        message: `Analyzing Batch ${i + 1} of ${totalBatches}...`,
                        increment: progressIncrement
                    });
                    const response = await (0, node_fetch_1.default)('http://127.0.0.1:5000/security/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code_batch: batch })
                    });
                    if (token.isCancellationRequested) {
                        return;
                    }
                    if (!response.ok) {
                        throw new Error(`Backend returned an error for Batch ${i + 1}.`);
                    }
                    const vulnerabilitiesFromBatch = await response.json();
                    // THIS IS THE KEY CHANGE: Add results from the current batch and refresh the UI
                    if (vulnerabilitiesFromBatch.length > 0) {
                        totalVulnerabilitiesFound += vulnerabilitiesFromBatch.length;
                        vulnerabilityProvider.addVulnerabilities(vulnerabilitiesFromBatch, projectRoot);
                    }
                }
                // Step 3: Finalize the scan
                vulnerabilityProvider.setScanComplete();
                vscode.window.showInformationMessage(`Vulnerability scan complete. Found ${totalVulnerabilitiesFound} potential issues.`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Vulnerability scan failed: ${error.message}`);
                console.error(error);
            }
        });
    });
    // Add all new and existing commands to the subscriptions
    context.subscriptions.push(analyzeProjectCommand, modernizeCodeCommand, scanForVulnerabilitiesCommand, generateDocsCommand // <-- Added the new command here
    );
}
// --- HELPER FUNCTIONS FOR 'ANALYZE PROJECT' COMMAND ---
async function performLocalAnalysis(rootDir) {
    const stats = {};
    let totalFiles = 0;
    let totalLines = 0;
    async function traverse(currentPath) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            if (EXCLUDE_DIRS_ANALYZE.has(entry.name)) {
                continue;
            }
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                await traverse(fullPath);
            }
            else if (entry.isFile()) {
                const language = LANGUAGE_MAP_ANALYZE[path.extname(entry.name)];
                if (language) {
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
            }
        }
    }
    await traverse(rootDir);
    stats['SUM'] = { nFiles: totalFiles, code: totalLines };
    return stats;
}
async function analyzeLocalFolder(projectRoot, progress) {
    progress.report({ increment: 40, message: "Counting local files and lines of code..." });
    const analysisResult = await performLocalAnalysis(projectRoot);
    const summary = analysisResult.SUM;
    delete analysisResult.SUM;
    return {
        projectName: path.basename(projectRoot) + " (Local)",
        repositoryUrl: "Local Folder",
        lastAnalysisDate: new Date().toISOString(),
        identification: { languageBreakdown: analysisResult, totalFiles: summary.nFiles, totalLinesOfCode: summary.code, dependencyCount: "N/A" },
        activity: { lastCommitDate: "N/A", totalCommits: "N/A", contributorCount: "N/A", commitFrequency: "N/A", activeBranches: "N/A" },
        qualityHealth: { technicalDebtRatio: "N/A", codeIssues: { critical: "N/A", major: "N/A", minor: "N/A" }, codeCoverage: "N/A", cyclomaticComplexity: "N/A", duplicatedLines: "N/A" }
    };
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
        const errorData = await response.json().catch(() => ({ error: "Received a non-JSON response from the server." }));
        throw new Error(errorData.error);
    }
    return await response.json();
}
async function isGitRepository(directory) {
    try {
        const stats = await fs.stat(path.join(directory, '.git'));
        return stats.isDirectory();
    }
    catch (error) {
        return false;
    }
}
function getGitRemoteUrl(cwd) {
    return new Promise((resolve) => {
        (0, child_process_1.exec)('git config --get remote.origin.url', { cwd }, (err, stdout) => {
            resolve((err || !stdout) ? null : stdout.trim());
        });
    });
}
/**
 * Called when the extension is deactivated.
 */
function deactivate() { }
//# sourceMappingURL=extension.js.map