// src/commands/generateDocumentation.ts

import * as vscode from 'vscode';
import { ApiService } from '../services/ApiService';

export function registerGenerateDocumentationCommand() {
    return vscode.commands.registerCommand('cloudcode.generateDocumentation', async () => { // CORRECT
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText || selection.isEmpty) {
            vscode.window.showInformationMessage('Please select a code snippet to generate documentation for.');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating Documentation...",
            cancellable: true
        }, async (progress, token) => {
            try {
                const result = await ApiService.generateDocumentation(selectedText, editor.document.languageId);

                if (token.isCancellationRequested) {
                    return;
                }

                // Insert the documentation above the selected code
                await editor.edit(editBuilder => {
                    const position = selection.start; // Get the starting position of the selection
                    const documentationWithNewline = result.documentation + '\n';
                    editBuilder.insert(position, documentationWithNewline);
                });

                vscode.window.showInformationMessage('Documentation generated successfully.');

            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to generate documentation: ${error.message}`);
            }
        });
    });
}