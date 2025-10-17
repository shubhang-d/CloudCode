import * as vscode from 'vscode';
import { ProjectAnalysisProvider } from './ProjectAnalysisProvider';
import fetch from 'node-fetch';
import { exec } from 'child_process'; // Import the 'exec' function

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "cloudcode" is now active!');

    // Create and register the Tree View provider (no changes here)
    const projectAnalysisProvider = new ProjectAnalysisProvider();
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
                const response = await fetch('http://127.0.0.1:5000/analyze', {
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

            } catch (error: any) {
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
function getGitRemoteUrl(cwd: string): Promise<string | null> {
    return new Promise((resolve) => {
        // Execute the command to get the remote URL for 'origin'
        exec('git config --get remote.origin.url', { cwd }, (err, stdout, stderr) => {
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
export function deactivate() {}
