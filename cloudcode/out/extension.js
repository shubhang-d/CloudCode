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
const ProjectAnalysisProvider_1 = require("./ProjectAnalysisProvider");
const node_fetch_1 = __importDefault(require("node-fetch"));
const child_process_1 = require("child_process"); // Import the 'exec' function
// This method is called when your extension is activated
function activate(context) {
    console.log('Congratulations, your extension "cloudcode" is now active!');
    // Create and register the Tree View provider (no changes here)
    const projectAnalysisProvider = new ProjectAnalysisProvider_1.ProjectAnalysisProvider();
    vscode.window.registerTreeDataProvider('cloudcode.projectsView', projectAnalysisProvider);
    // Register the command to trigger the analysis
    let disposable = vscode.commands.registerCommand('cloudcode.analyzeProject', async () => {
        // 1. GET THE CURRENTLY OPEN PROJECT FOLDER
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder to analyze.');
            return;
        }
        const projectRoot = workspaceFolders[0].uri.fsPath;
        console.log(`Analyzing project at path: ${projectRoot}`);
        // Start the progress notification
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing Project...",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: "Finding Git remote URL..." });
                // 2. GET THE GIT REMOTE URL FROM THE LOCAL FOLDER
                const repoUrl = await getGitRemoteUrl(projectRoot);
                if (!repoUrl) {
                    throw new Error("Could not find a remote Git URL. Is this a Git repository with a remote named 'origin'?");
                }
                console.log(`Found remote URL: ${repoUrl}`);
                progress.report({ increment: 20, message: "Connecting to analysis backend..." });
                // 3. SEND THE FOUND URL TO THE BACKEND (same as before)
                const response = await (0, node_fetch_1.default)('http://127.0.0.1:5000/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repositoryUrl: repoUrl })
                });
                progress.report({ increment: 70, message: "Processing data..." });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const metadata = await response.json();
                // 4. REFRESH THE SIDEBAR WITH THE NEW DATA (same as before)
                projectAnalysisProvider.refreshWithData(metadata);
                vscode.window.showInformationMessage(`Analysis of '${metadata.projectName}' complete!`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
                console.error(error);
            }
        });
    });
    context.subscriptions.push(disposable);
}
/**
 * A helper function to run the git command and get the remote URL.
 * It uses a Promise to work nicely with async/await.
 * @param cwd The directory to run the command in (the project root).
 */
function getGitRemoteUrl(cwd) {
    return new Promise((resolve) => {
        // Execute the command to get the remote URL for 'origin'
        (0, child_process_1.exec)('git config --get remote.origin.url', { cwd }, (err, stdout, stderr) => {
            if (err) {
                console.error("Git command failed:", stderr);
                resolve(null); // Resolve with null if there's an error
                return;
            }
            resolve(stdout.trim()); // Resolve with the URL, trimming any whitespace
        });
    });
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map