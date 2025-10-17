import * as vscode from 'vscode';

// We can keep the InfoItem class as is, it's perfectly reusable.
export class InfoItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        // We add an optional description to show values on the same line
        public readonly description?: string
    ) {
        super(label, collapsibleState);
    }
}

export class ProjectAnalysisProvider implements vscode.TreeDataProvider<InfoItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<InfoItem | undefined | null | void> = new vscode.EventEmitter<InfoItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<InfoItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private analysisData: any = null;

    getChildren(element?: InfoItem): vscode.ProviderResult<InfoItem[]> {
        if (!this.analysisData) {
            return Promise.resolve([new InfoItem("Analyze a project to see details", vscode.TreeItemCollapsibleState.None)]);
        }

        // Root level items
        if (!element) {
            return Promise.resolve([
                new InfoItem('Project Info', vscode.TreeItemCollapsibleState.Expanded),
                new InfoItem('Identification', vscode.TreeItemCollapsibleState.Expanded),
                new InfoItem('Activity', vscode.TreeItemCollapsibleState.Expanded),
                new InfoItem('Quality Health (Placeholders)', vscode.TreeItemCollapsibleState.Expanded)
            ]);
        }

        // Child level items
        switch (element.label) {
            case 'Project Info':
                return Promise.resolve([
                    new InfoItem('Name', vscode.TreeItemCollapsibleState.None, this.analysisData.projectName),
                    new InfoItem('URL', vscode.TreeItemCollapsibleState.None, this.analysisData.repositoryUrl),
                    new InfoItem('Last Analysis', vscode.TreeItemCollapsibleState.None, new Date(this.analysisData.lastAnalysisDate).toLocaleString())
                ]);

            case 'Identification':
                return Promise.resolve([
                    new InfoItem('Total Files', vscode.TreeItemCollapsibleState.None, this.analysisData.identification.totalFiles.toString()),
                    new InfoItem('Lines of Code', vscode.TreeItemCollapsibleState.None, this.analysisData.identification.totalLinesOfCode.toString()),
                    new InfoItem('Dependencies', vscode.TreeItemCollapsibleState.None, this.analysisData.identification.dependencyCount.toString()),
                    new InfoItem('Languages', vscode.TreeItemCollapsibleState.Collapsed)
                ]);
            
            case 'Languages':
                const langBreakdown = this.analysisData.identification.languageBreakdown;
                return Promise.resolve(Object.keys(langBreakdown).map(lang =>
                    new InfoItem(lang, vscode.TreeItemCollapsibleState.None, `${langBreakdown[lang].code} lines`)
                ));

            case 'Activity':
                return Promise.resolve([
                    new InfoItem('Last Commit', vscode.TreeItemCollapsibleState.None, new Date(this.analysisData.activity.lastCommitDate).toLocaleString()),
                    new InfoItem('Total Commits', vscode.TreeItemCollapsibleState.None, this.analysisData.activity.totalCommits.toString()),
                    new InfoItem('Contributors', vscode.TreeItemCollapsibleState.None, this.analysisData.activity.contributorCount.toString()),
                    new InfoItem('Commit Frequency', vscode.TreeItemCollapsibleState.None, `${this.analysisData.activity.commitFrequency} commits/month`),
                    new InfoItem('Active Branches', vscode.TreeItemCollapsibleState.None, this.analysisData.activity.activeBranches.toString())
                ]);
            
            case 'Quality Health (Placeholders)':
                return Promise.resolve([
                    new InfoItem('Code Coverage', vscode.TreeItemCollapsibleState.None, this.analysisData.qualityHealth.codeCoverage),
                    new InfoItem('Technical Debt Ratio', vscode.TreeItemCollapsibleState.None, this.analysisData.qualityHealth.technicalDebtRatio),
                    new InfoItem('Cyclomatic Complexity', vscode.TreeItemCollapsibleState.None, this.analysisData.qualityHealth.cyclomaticComplexity),
                    new InfoItem('Duplicated Lines', vscode.TreeItemCollapsibleState.None, this.analysisData.qualityHealth.duplicatedLines),
                    new InfoItem('Code Issues', vscode.TreeItemCollapsibleState.Collapsed)
                ]);

            case 'Code Issues':
                const issues = this.analysisData.qualityHealth.codeIssues;
                return Promise.resolve([
                    new InfoItem('Critical', vscode.TreeItemCollapsibleState.None, issues.critical.toString()),
                    new InfoItem('Major', vscode.TreeItemCollapsibleState.None, issues.major.toString()),
                    new InfoItem('Minor', vscode.TreeItemCollapsibleState.None, issues.minor.toString())
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