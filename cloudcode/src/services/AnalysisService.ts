// src/services/AnalysisService.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectAnalysis } from '../core/types';
import { performLocalAnalysis } from '../utilities/fileSystemUtils';
import { ApiService } from './ApiService';

/**
 * Creates a project analysis report for a local-only folder.
 * @param projectRoot The root path of the project.
 * @returns A ProjectAnalysis object with local data.
 */
export async function analyzeLocalFolder(projectRoot: string): Promise<ProjectAnalysis> {
    const analysisResult = await performLocalAnalysis(projectRoot);
    const summary = analysisResult.SUM;
    delete analysisResult.SUM;

    // We construct a ProjectAnalysis object, filling in what we can from local data.
    return {
        projectName: path.basename(projectRoot) + " (Local)",
        repositoryUrl: "Local Folder",
        lastAnalysisDate: new Date().toISOString(),
        identification: {
            languageBreakdown: analysisResult,
            totalFiles: summary.nFiles,
            totalLinesOfCode: summary.code,
            dependencyCount: "N/A"
        },
        activity: {
            lastCommitDate: "N/A",
            totalCommits: "N/A",
            contributorCount: "N/A",
            commitFrequency: "N/A",
            activeBranches: "N/A"
        },
        qualityHealth: {
            technicalDebtRatio: "N/A",
            codeIssues: { critical: "N/A", major: "N/A", minor: "N/A" },
            codeCoverage: "N/A",
            cyclomaticComplexity: "N/A",
            duplicatedLines: "N/A"
        }
    };
}

/**
 * Orchestrates a remote repository analysis via the backend.
 * @param repoUrl The URL of the Git repository.
 * @param progress A VS Code progress object to report updates to the user.
 * @returns A promise that resolves to the full project analysis from the backend.
 */
export async function analyzeRemoteRepo(repoUrl: string, progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<ProjectAnalysis> {
    progress.report({ increment: 30, message: "Connecting to analysis backend..." });
    const result = await ApiService.analyzeRemoteRepo(repoUrl);
    progress.report({ increment: 80, message: "Processing backend data..." });
    return result;
}