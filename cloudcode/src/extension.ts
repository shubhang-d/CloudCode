import * as vscode from 'vscode';
import { ProjectAnalysisProvider } from './providers/ProjectAnalysisProvider';
import { ExplainViewProvider } from './providers/ExplainViewProvider';
import { VulnerabilityProvider } from './providers/VulnerabilityProvider';
import { registerAnalyzeProjectCommand } from './commands/analyzeProject';
import { registerModernizeSelectionCommand } from './commands/modernizeSelection';
import { registerScanForVulnerabilitiesCommand } from './commands/scanForVulnerabilities';
import { registerGenerateDocumentationCommand } from './commands/generateDocumentation';

/**
 * The main activation function, called once when the extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('CloudCode extension is now active!');

    // --- 1. INITIALIZE PROVIDERS ---
    // These manage the UI components in the VS Code sidebar.
    const projectAnalysisProvider = new ProjectAnalysisProvider();
    const explainProvider = new ExplainViewProvider(context.extensionUri);
    const vulnerabilityProvider = new VulnerabilityProvider();

    // --- 2. REGISTER VIEW PROVIDERS ---
    // This tells VS Code how to create and manage our custom views.
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('cloudcode.projectsView', projectAnalysisProvider),
        vscode.window.registerWebviewViewProvider(ExplainViewProvider.viewType, explainProvider),
        vscode.window.registerTreeDataProvider('cloudcode.vulnerabilitiesView', vulnerabilityProvider)
    );

    // --- 3. REGISTER COMMANDS ---
    // Each command is now in its own file. We register them here and pass any
    // necessary dependencies (like a provider) to them.
    context.subscriptions.push(
        registerAnalyzeProjectCommand(projectAnalysisProvider),
        registerModernizeSelectionCommand(),
        registerScanForVulnerabilitiesCommand(vulnerabilityProvider),
        registerGenerateDocumentationCommand()
    );
    
    // --- 4. REGISTER EVENT LISTENERS ---
    // Automatically populates the "Explain Code" view when text is selected.
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(e => {
            if (!e.textEditor.selection.isEmpty) {
                const selectedText = e.textEditor.document.getText(e.textEditor.selection);
                explainProvider.populateFromSelection(selectedText);
            }
        })
    );
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate() {}