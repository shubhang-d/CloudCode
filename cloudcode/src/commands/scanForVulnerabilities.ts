import * as vscode from 'vscode';
import { VulnerabilityProvider } from '../providers/VulnerabilityProvider';
import { createCodeBatches } from '../utilities/fileSystemUtils';
import { ApiService } from '../services/ApiService';

export function registerScanForVulnerabilitiesCommand(vulnerabilityProvider: VulnerabilityProvider) {
    return vscode.commands.registerCommand('cloudcode.scanForVulnerabilities', async () => {
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
                vulnerabilityProvider.clear();
                
                progress.report({ message: "Preparing code batches...", increment: 5 });
                const codeBatches = await createCodeBatches(projectRoot);

                if (token.isCancellationRequested) return;

                if (codeBatches.length === 0) {
                    vscode.window.showInformationMessage("No scannable files found in the project.");
                    vulnerabilityProvider.setScanComplete();
                    return;
                }

                let totalVulnerabilitiesFound = 0;
                const totalBatches = codeBatches.length;

                for (let i = 0; i < totalBatches; i++) {
                    if (token.isCancellationRequested) return;

                    const batch = codeBatches[i];
                    const progressIncrement = (1 / totalBatches) * 90;
                    progress.report({ message: `Analyzing Batch ${i + 1} of ${totalBatches}...`, increment: progressIncrement });

                    const vulnerabilitiesFromBatch = await ApiService.scanCodeBatch(batch);
                    
                    if (vulnerabilitiesFromBatch.length > 0) {
                        totalVulnerabilitiesFound += vulnerabilitiesFromBatch.length;
                        vulnerabilityProvider.addVulnerabilities(vulnerabilitiesFromBatch, projectRoot);
                    }
                }
                
                vulnerabilityProvider.setScanComplete();
                vscode.window.showInformationMessage(`Scan complete. Found ${totalVulnerabilitiesFound} potential issues.`);

            } catch (error: any) {
                vscode.window.showErrorMessage(`Vulnerability scan failed: ${error.message}`);
                console.error(error);
            }
        });
    });
}