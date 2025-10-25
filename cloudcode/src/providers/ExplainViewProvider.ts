// src/ExplainViewProvider.ts

import * as vscode from 'vscode';
import fetch from 'node-fetch';

export class ExplainViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cloudcode.explainView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}
    
    // This new method allows the extension to push selected text into the webview
    public populateFromSelection(text: string) {
        if (this._view) {
            this._view.show?.(true); // Make sure the view is visible
            this._view.webview.postMessage({ type: 'setSelectedText', value: text });
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'node_modules'), this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'explainCode':
                    try {
                        const response = await fetch('http://127.0.0.1:5000/explain-code', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code_snippet: data.value })
                        });

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
                            throw new Error(errorData.error);
                        }

                        const result: any = await response.json();
                        this._view?.webview.postMessage({ type: 'addExplanation', value: result.explanation });

                    } catch (error: any) {
                        this._view?.webview.postMessage({ type: 'addError', value: `Error: ${error.message}` });
                    }
                    break;
            }
        });

        // When the view becomes visible, try to populate it with any active selection
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                const editor = vscode.window.activeTextEditor;
                if (editor && !editor.selection.isEmpty) {
                    const selectedText = editor.document.getText(editor.selection);
                    this.populateFromSelection(selectedText);
                }
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.js'));
        const markdownItUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'markdown-it', 'dist', 'markdown-it.min.js'));

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script type="module" src="${toolkitUri}"></script>
                <script src="${markdownItUri}"></script>
                <style>
                    body, html {
                        height: 100%;
                        margin: 0;
                        padding: 0;
                        background-color: var(--vscode-side-bar-background);
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    .container {
                        padding: 1em;
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                        box-sizing: border-box;
                    }
                    .button-group {
                        display: flex;
                        gap: 0.5em;
                        margin-top: 0.5em;
                    }
                    vscode-button {
                        width: 100%;
                    }
                    #explanation-output {
                        margin-top: 1em;
                        margin-bottom: 0.5em;
                        padding: 0.5em 1em;
                        border-radius: 4px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-input-border, transparent);
                        overflow-y: auto;
                        flex-grow: 1;
                    }
                    #explanation-output.loading {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--vscode-description-foreground);
                    }
                    .spinner {
                        border: 2px solid var(--vscode-description-foreground);
                        border-top: 2px solid var(--vscode-button-background);
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    /* Markdown styles */
                    #explanation-output h1, #explanation-output h2, #explanation-output h3 {
                        border-bottom: 1px solid var(--vscode-separator-foreground);
                        padding-bottom: 0.3em;
                    }
                    #explanation-output code {
                        background-color: var(--vscode-text-code-block-background);
                        padding: 0.2em 0.4em;
                        border-radius: 3px;
                    }
                    #explanation-output pre > code {
                        display: block;
                        padding: 0.5em;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    #explanation-output blockquote {
                        border-left: 3px solid var(--vscode-description-foreground);
                        padding-left: 1em;
                        margin-left: 0;
                        color: var(--vscode-description-foreground);
                    }
                </style>
				<title>Explain Code</title>
			</head>
			<body>
                <div class="container">
                    <div id="explanation-output"></div>
                    <vscode-text-area id="code-input" placeholder="Paste code here, or select code in the editor..." rows="8"></vscode-text-area>
                    <div class="button-group">
                        <vscode-button id="explain-button">Explain Code</vscode-button>
                        <vscode-button id="clear-button" appearance="secondary">Clear</vscode-button>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const md = window.markdownit();
                    const explainButton = document.getElementById('explain-button');
                    const clearButton = document.getElementById('clear-button');
                    const codeInput = document.getElementById('code-input');
                    const outputDiv = document.getElementById('explanation-output');

                    explainButton.addEventListener('click', () => {
                        const code = codeInput.value;
                        if (code) {
                            outputDiv.className = 'loading';
                            outputDiv.innerHTML = '<div class="spinner"></div>';
                            vscode.postMessage({ type: 'explainCode', value: code });
                        }
                    });

                    clearButton.addEventListener('click', () => {
                        codeInput.value = '';
                        outputDiv.innerHTML = '';
                        outputDiv.className = '';
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        outputDiv.className = ''; // Reset class
                        switch (message.type) {
                            case 'addExplanation':
                                outputDiv.innerHTML = md.render(message.value);
                                break;
                            case 'addError':
                                outputDiv.innerHTML = \`<p style="color:var(--vscode-errorForeground);">\${message.value}</p>\`;
                                break;
                            case 'setSelectedText':
                                codeInput.value = message.value;
                                break;
                        }
                    });
                </script>
			</body>
			</html>`;
    }
}