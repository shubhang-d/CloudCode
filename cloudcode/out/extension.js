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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ProjectAnalysisProvider_1 = require("./providers/ProjectAnalysisProvider");
const ExplainViewProvider_1 = require("./providers/ExplainViewProvider");
const VulnerabilityProvider_1 = require("./providers/VulnerabilityProvider");
const analyzeProject_1 = require("./commands/analyzeProject");
const modernizeSelection_1 = require("./commands/modernizeSelection");
const scanForVulnerabilities_1 = require("./commands/scanForVulnerabilities");
const generateDocumentation_1 = require("./commands/generateDocumentation");
/**
 * The main activation function, called once when the extension is activated.
 */
function activate(context) {
    console.log('CloudCode extension is now active!');
    // --- 1. INITIALIZE PROVIDERS ---
    // These manage the UI components in the VS Code sidebar.
    const projectAnalysisProvider = new ProjectAnalysisProvider_1.ProjectAnalysisProvider();
    const explainProvider = new ExplainViewProvider_1.ExplainViewProvider(context.extensionUri);
    const vulnerabilityProvider = new VulnerabilityProvider_1.VulnerabilityProvider();
    // --- 2. REGISTER VIEW PROVIDERS ---
    // This tells VS Code how to create and manage our custom views.
    context.subscriptions.push(vscode.window.registerTreeDataProvider('cloudcode.projectsView', projectAnalysisProvider), vscode.window.registerWebviewViewProvider(ExplainViewProvider_1.ExplainViewProvider.viewType, explainProvider), vscode.window.registerTreeDataProvider('cloudcode.vulnerabilitiesView', vulnerabilityProvider));
    // --- 3. REGISTER COMMANDS ---
    // Each command is now in its own file. We register them here and pass any
    // necessary dependencies (like a provider) to them.
    context.subscriptions.push((0, analyzeProject_1.registerAnalyzeProjectCommand)(projectAnalysisProvider), (0, modernizeSelection_1.registerModernizeSelectionCommand)(), (0, scanForVulnerabilities_1.registerScanForVulnerabilitiesCommand)(vulnerabilityProvider), (0, generateDocumentation_1.registerGenerateDocumentationCommand)());
    // --- 4. REGISTER EVENT LISTENERS ---
    // Automatically populates the "Explain Code" view when text is selected.
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
        if (!e.textEditor.selection.isEmpty) {
            const selectedText = e.textEditor.document.getText(e.textEditor.selection);
            explainProvider.populateFromSelection(selectedText);
        }
    }));
}
/**
 * Called when the extension is deactivated.
 */
function deactivate() { }
//# sourceMappingURL=extension.js.map