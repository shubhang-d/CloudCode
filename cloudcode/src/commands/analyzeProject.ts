// src/commands/analyzeProject.ts

import * as vscode from 'vscode';
import { ProjectAnalysisProvider } from '../providers/ProjectAnalysisProvider';
import { isGitRepository, getGitRemoteUrl } from '../utilities/gitUtils';
import { analyzeLocalFolder, analyzeRemoteRepo } from '../services/AnalysisService';

export function registerAnalyzeProjectCommand(analysisProvider: ProjectAnalysisProvider) {
    return vscode.commands.registerCommand('cloudcode.analyzeProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder to analyze.');
            return;
        }
        const projectRoot = workspaceFolders[0].uri.fsPath;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing Project...",
            cancellable: false
        }, async (progress) => {
            try {
                let metadata;
                const isGit = await isGitRepository(projectRoot);

                if (isGit) {
                    const repoUrl = await getGitRemoteUrl(projectRoot);
                    if (repoUrl) {
                        metadata = await analyzeRemoteRepo(repoUrl, progress);
                    } else {
                        vscode.window.showWarningMessage("Git repo found, but no remote 'origin' detected. Performing local-only analysis.");
                        metadata = await analyzeLocalFolder(projectRoot);
                    }
                } else {
                    vscode.window.showInformationMessage("This is not a Git repository. Performing local-only analysis.");
                    metadata = await analyzeLocalFolder(projectRoot);
                }

                analysisProvider.refreshWithData(metadata);
                vscode.window.showInformationMessage(`Analysis of '${metadata.projectName}' complete!`);

            } catch (error: any) {
                vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
            }
        });
    });
}