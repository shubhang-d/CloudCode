// src/ProjectAnalysisProvider.ts

import * as vscode from 'vscode';

export class InfoItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
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
            return Promise.resolve([new InfoItem("Run 'Analyze Project' to see details", vscode.TreeItemCollapsibleState.None)]);
        }

        // Root level items
        if (!element) {
            return Promise.resolve([
                new InfoItem('Project Info', vscode.TreeItemCollapsibleState.Expanded),
                new InfoItem('Identification', vscode.TreeItemCollapsibleState.Expanded),
                new InfoItem('Activity', vscode.TreeItemCollapsibleState.Expanded),
                new InfoItem('Quality Health', vscode.TreeItemCollapsibleState.Expanded)
            ]);
        }

        // Using optional chaining (?.) and nullish coalescing (??) for safety.
        // This prevents errors if any part of the data is missing and provides a default value.
        switch (element.label) {
            case 'Project Info':
                const projectName = this.analysisData?.projectName ?? 'N/A';
                const repoUrl = this.analysisData?.repositoryUrl ?? 'N/A';
                const lastAnalysis = this.analysisData?.lastAnalysisDate ? new Date(this.analysisData.lastAnalysisDate).toLocaleString() : 'N/A';

                return Promise.resolve([
                    new InfoItem('Name', vscode.TreeItemCollapsibleState.None, this.analysisData?.projectName ?? 'N/A'),
                    new InfoItem('URL', vscode.TreeItemCollapsibleState.None, this.analysisData?.repositoryUrl ?? 'N/A'),
                    new InfoItem('Last Analysis', vscode.TreeItemCollapsibleState.None, this.analysisData?.lastAnalysisDate ? new Date(this.analysisData.lastAnalysisDate).toLocaleString() : 'N/A')
                ]);

            case 'Identification':
                const totalFiles = (this.analysisData?.identification?.totalFiles ?? 'N/A').toString();
                const linesOfCode = (this.analysisData?.identification?.totalLinesOfCode ?? 'N/A').toString();
                const dependencies = (this.analysisData?.identification?.dependencyCount ?? 'N/A').toString();

                return Promise.resolve([
                    new InfoItem('Total Files', vscode.TreeItemCollapsibleState.None, (this.analysisData?.identification?.totalFiles ?? 'N/A').toString()),
                    new InfoItem('Lines of Code', vscode.TreeItemCollapsibleState.None, (this.analysisData?.identification?.totalLinesOfCode ?? 'N/A').toString()),
                    new InfoItem('Dependencies', vscode.TreeItemCollapsibleState.None, (this.analysisData?.identification?.dependencyCount ?? 'N/A').toString()),
                    new InfoItem('Languages', vscode.TreeItemCollapsibleState.Collapsed)
                ]);
            
            case 'Languages':
                const langBreakdown = this.analysisData?.identification?.languageBreakdown ?? {};
                if (Object.keys(langBreakdown).length === 0) {
                    return Promise.resolve([new InfoItem('No language data found', vscode.TreeItemCollapsibleState.None)]);
                }
                return Promise.resolve(Object.keys(langBreakdown).map(lang =>
                    new InfoItem(lang, vscode.TreeItemCollapsibleState.None, `${langBreakdown[lang].code} lines`)
                ));

            case 'Activity':
                const lastCommit = this.analysisData?.activity?.lastCommitDate ? new Date(this.analysisData.activity.lastCommitDate).toLocaleString() : 'N/A';
                const totalCommits = (this.analysisData?.activity?.totalCommits ?? 'N/A').toString();
                const contributors = (this.analysisData?.activity?.contributorCount ?? 'N/A').toString();
                const commitFreq = (this.analysisData?.activity?.commitFrequency ?? 'N/A').toString();
                const activeBranches = (this.analysisData?.activity?.activeBranches ?? 'N/A').toString();

                return Promise.resolve([
                    new InfoItem('Last Commit', vscode.TreeItemCollapsibleState.None, this.analysisData?.activity?.lastCommitDate ? new Date(this.analysisData.activity.lastCommitDate).toLocaleString() : 'N/A'),
                    new InfoItem('Total Commits', vscode.TreeItemCollapsibleState.None, (this.analysisData?.activity?.totalCommits ?? 'N/A').toString()),
                    new InfoItem('Contributors', vscode.TreeItemCollapsibleState.None, (this.analysisData?.activity?.contributorCount ?? 'N/A').toString()),
                    new InfoItem('Commit Frequency', vscode.TreeItemCollapsibleState.None, `${this.analysisData?.activity?.commitFrequency ?? 'N/A'} commits/month`),
                    new InfoItem('Active Branches', vscode.TreeItemCollapsibleState.None, (this.analysisData?.activity?.activeBranches ?? 'N/A').toString())
                ]);
            
            case 'Quality Health':
                return Promise.resolve([
                    new InfoItem('Code Coverage', vscode.TreeItemCollapsibleState.None, this.analysisData?.qualityHealth?.codeCoverage ?? 'N/A'),
                    new InfoItem('Technical Debt Ratio', vscode.TreeItemCollapsibleState.None, this.analysisData?.qualityHealth?.technicalDebtRatio ?? 'N/A'),
                    new InfoItem('Cyclomatic Complexity', vscode.TreeItemCollapsibleState.None, this.analysisData?.qualityHealth?.cyclomaticComplexity ?? 'N/A'),
                    new InfoItem('Duplicated Lines', vscode.TreeItemCollapsibleState.None, this.analysisData?.qualityHealth?.duplicatedLines ?? 'N/A'),
                    new InfoItem('Code Issues', vscode.TreeItemCollapsibleState.Collapsed)
                ]);

            case 'Code Issues':
                const issues = this.analysisData?.qualityHealth?.codeIssues;
                return Promise.resolve([
                    new InfoItem('Critical', vscode.TreeItemCollapsibleState.None, (issues?.critical ?? 'N/A').toString()),
                    new InfoItem('Major', vscode.TreeItemCollapsibleState.None, (issues?.major ?? 'N/A').toString()),
                    new InfoItem('Minor', vscode.TreeItemCollapsibleState.None, (issues?.minor ?? 'N/A').toString())
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