// src/core/types.ts

import * as vscode from 'vscode';

// Defines the structure for a single vulnerability finding.
export interface Vulnerability {
    file_path: string;
    line_number: number;
    line_of_code: string;
    vulnerability_type: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
    cwe: string;
    description: string;
    suggested_solution: string;
}

// Defines the structure for the complete project analysis report.
export interface ProjectAnalysis {
    projectName: string;
    repositoryUrl: string;
    lastAnalysisDate: string;
    identification: {
        languageBreakdown: { [key: string]: { code: number } };
        totalFiles: number;
        totalLinesOfCode: number;
        dependencyCount: number | 'N/A';
    };
    activity: {
        lastCommitDate: string | 'N/A';
        totalCommits: number | 'N/A';
        contributorCount: number | 'N/A';
        commitFrequency: number | 'N/A';
        activeBranches: number | 'N/A';
    };
    qualityHealth: {
        technicalDebtRatio: string | 'N/A';
        codeIssues: {
            critical: number | 'N/A';
            major: number | 'N/A';
            minor: number | 'N/A';
        };
        codeCoverage: string | 'N/A';
        cyclomaticComplexity: string | 'N/A';
        duplicatedLines: string | 'N/A';
    };
}

// A simple tree item for displaying information in a tree view.
export class InfoItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly description?: string
    ) {
        super(label, collapsibleState);
    }
}