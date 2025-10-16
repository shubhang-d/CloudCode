import * as vscode from 'vscode';

export class InfoItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string // Used to identify the type of item
    ) {
        super(label, collapsibleState);
    }
}

export class ProjectAnalysisProvider implements vscode.TreeDataProvider<InfoItem> {

    // An event emitter that fires when the tree data changes.
    // VS Code listens to this to know when to refresh the view.
    private _onDidChangeTreeData: vscode.EventEmitter<InfoItem | undefined | null | void> = new vscode.EventEmitter<InfoItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<InfoItem | undefined | null | void> = this._onDidChangeTreeData.event;

    // A private property to hold the metadata from our backend
    private analysisData: any = null;

    // This method is called by VS Code to get the root items or children of an element.
    getChildren(element?: InfoItem): vscode.ProviderResult<InfoItem[]> {
        if (!this.analysisData) {
            return Promise.resolve([new InfoItem("Analyze a project to see details", vscode.TreeItemCollapsibleState.None)]);
        }

        if (element) {
            switch (element.label) {
                case 'Identification':
                    return Promise.resolve([
                        new InfoItem(`Total Files: ${this.analysisData.identification.totalFiles}`, vscode.TreeItemCollapsibleState.None),
                        new InfoItem(`Lines of Code: ${this.analysisData.identification.totalLinesOfCode}`, vscode.TreeItemCollapsibleState.None),
                        new InfoItem('Languages', vscode.TreeItemCollapsibleState.Collapsed)
                    ]);
                case 'Languages':
                    // Map the language data from the backend to TreeItems
                    const langBreakdown = this.analysisData.identification.languageBreakdown;
                    return Promise.resolve(Object.keys(langBreakdown).map(lang =>
                        new InfoItem(`${lang}: ${langBreakdown[lang].code} lines`, vscode.TreeItemCollapsibleState.None)
                    ));
                case 'Activity':
                    return Promise.resolve([
                        new InfoItem(`Total Commits: ${this.analysisData.activity.totalCommits}`, vscode.TreeItemCollapsibleState.None),
                        new InfoItem(`Contributors: ${this.analysisData.activity.contributorCount}`, vscode.TreeItemCollapsibleState.None)
                    ]);
                case 'Quality Health':
                     return Promise.resolve([
                        new InfoItem(`Technical Debt: ${this.analysisData.qualityHealth.technicalDebtRatio}`, vscode.TreeItemCollapsibleState.None)
                    ]);
                default:
                    return Promise.resolve([]);
            }
        } else {
            return Promise.resolve([
                new InfoItem('Identification', vscode.TreeItemCollapsibleState.Collapsed),
                new InfoItem('Activity', vscode.TreeItemCollapsibleState.Collapsed),
                new InfoItem('Quality Health', vscode.TreeItemCollapsibleState.Collapsed)
            ]);
        }
    }

    getTreeItem(element: InfoItem): vscode.TreeItem {
        return element;
    }

    public refreshWithData(data: any): void {
        this.analysisData = data;
        this._onDidChangeTreeData.fire();
    }
}