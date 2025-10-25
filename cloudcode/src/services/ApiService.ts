// src/services/ApiService.ts

import fetch from 'node-fetch';
import { API_BASE_URL } from '../core/constants';
import { ProjectAnalysis, Vulnerability } from '../core/types';

/**
 * A wrapper for handling API requests to the backend.
 * @param endpoint The API endpoint to call (e.g., '/analyze').
 * @param body The JSON body for the request.
 * @returns A promise that resolves to the JSON response.
 */
async function post<T>(endpoint: string, body: object): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server returned status ${response.status}` }));
        throw new Error(errorData.error || 'An unknown backend error occurred.');
    }

    return response.json() as Promise<T>;
}

// --- API Service Methods ---

export const ApiService = {
    /**
     * Sends a Git repository URL to the backend for a comprehensive analysis.
     */
    analyzeRemoteRepo: (repositoryUrl: string): Promise<ProjectAnalysis> => {
        return post<ProjectAnalysis>('/analyze', { repositoryUrl });
    },

    /**
     * Sends a code snippet to be modernized.
     */
    modernizeCode: (code_snippet: string, language: string): Promise<{ modernizedCode: string }> => {
        return post<{ modernizedCode: string }>('/refactor/modernize', { code_snippet, language });
    },

    /**
     * Sends a batch of code to be scanned for security vulnerabilities.
     */
    scanCodeBatch: (code_batch: string): Promise<Vulnerability[]> => {
        return post<Vulnerability[]>('/security/scan', { code_batch });
    },

    /**
     * Sends a code snippet to be explained by the AI.
     */
    explainCode: (code_snippet: string): Promise<{ explanation: string }> => {
        return post<{ explanation: string }>('/explain-code', { code_snippet });
    },

    generateDocumentation: (code_snippet: string, language: string): Promise<{ documentation: string }> => {
        return post<{ documentation: string }>('/refactor/generate-doc', { code_snippet, language });
    }
};