import * as vscode from 'vscode';
import { ProjectAnalysisProvider } from './ProjectAnalysisProvider'; 
import fetch from 'node-fetch';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "cloudcode" is now active!');

    // 1. CREATE AND REGISTER THE TREE VIEW DATA PROVIDER
    // This creates an instance of our provider class.
    const projectAnalysisProvider = new ProjectAnalysisProvider();
    
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
                    const response = await fetch('http://127.0.0.1:5000/analyze', {
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

                } catch (error: any) {
                    vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
                    console.error(error);
                }
            });
        }
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}