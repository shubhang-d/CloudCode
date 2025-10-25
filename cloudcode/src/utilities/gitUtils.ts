// src/utilities/gitUtils.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';

/**
 * Checks if a directory is a Git repository by looking for a .git folder.
 * @param directory The path to the directory.
 * @returns A promise that resolves to true if it's a Git repository, false otherwise.
 */
export async function isGitRepository(directory: string): Promise<boolean> {
    try {
        const stats = await fs.stat(path.join(directory, '.git'));
        return stats.isDirectory();
    } catch (error) {
        return false;
    }
}

/**
 * Gets the remote URL of the 'origin' remote from a Git repository.
 * @param cwd The directory of the Git repository.
 * @returns A promise that resolves to the remote URL string, or null if not found.
 */
export function getGitRemoteUrl(cwd: string): Promise<string | null> {
    return new Promise((resolve) => {
        exec('git config --get remote.origin.url', { cwd }, (err, stdout) => {
            resolve((err || !stdout) ? null : stdout.trim());
        });
    });
}