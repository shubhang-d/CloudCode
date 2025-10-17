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
// This method is called when your extension is activated
function activate(context) {
    console.log('Congratulations, your extension "cloudcode" is now active!');
    // 1. CREATE AND REGISTER THE TREE VIEW DATA PROVIDER
    // This creates an instance of our provider class.
    const projectAnalysisProvider = new ProjectAnalysisProvider_1.ProjectAnalysisProvider();
    // This registers the provider with VS Code. The first argument MUST match the view ID from package.json.
    vscode.window.registerTreeDataProvider('cloudcode.projectsView', projectAnalysisProvider);
    console.log("Tree data provider registered.");
    // 2. REGISTER THE COMMAND TO TRIGGER THE ANALYSIS
    let disposable = vscode.commands.registerCommand('cloudcode.analyzeProject', async () => {
        // Prompt the user to enter a Git repository URL
        const repoUrl = await vscode.window.showInputBox({
            prompt: "Enter a public Git repository URL to analyze",
            placeHolder: "e.g., https://github.com/microsoft/vscode-extension-samples.git"
        });
        if (repoUrl) {
            // Use vscode.window.withProgress to show a loading notification
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing Project...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Connecting to backend..." });
                try {
                    // Make the POST request to our Python backend
                    const response = await (0, node_fetch_1.default)('http://127.0.0.1:5000/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ repositoryUrl: repoUrl })
                    });
                    progress.report({ increment: 50, message: "Processing data..." });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                    }
                    const metadata = await response.json();
                    // IMPORTANT: Pass the received data to our provider and refresh the view
                    projectAnalysisProvider.refreshWithData(metadata);
                    vscode.window.showInformationMessage('Project analysis complete!');
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
                    console.error(error);
                }
            });
        }
    });
    context.subscriptions.push(disposable);
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map