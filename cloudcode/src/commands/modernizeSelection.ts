// src/commands/modernizeSelection.ts

import * as vscode from 'vscode';
import { ApiService } from '../services/ApiService';

export function registerModernizeSelectionCommand() {
    return vscode.commands.registerCommand('cloudcode.modernizeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText || selection.isEmpty) {
            vscode.window.showInformationMessage('Please select a code snippet to modernize.');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Modernizing Code...",
            cancellable: true
        }, async (progress, token) => {
            try {
                const result = await ApiService.modernizeCode(selectedText, editor.document.languageId);

                if (token.isCancellationRequested) return;

                await editor.edit(editBuilder => {
                    editBuilder.replace(selection, result.modernizedCode);
                });
                vscode.window.showInformationMessage('Code modernization complete.');

            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to modernize code: ${error.message}`);
            }
        });
    });
}