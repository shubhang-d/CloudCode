// src/utilities/fileSystemUtils.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { EXCLUDE_DIRS_SCAN, SCANNABLE_EXTENSIONS_SCAN, SAFE_CHAR_LIMIT, EXCLUDE_DIRS_ANALYZE, LANGUAGE_MAP_ANALYZE } from '../core/constants';

/**
 * Creates manageable batches of project code for security analysis.
 * @param rootDir The root directory of the project to scan.
 * @returns An array of strings, where each string is a batch of code.
 */
export async function createCodeBatches(rootDir: string): Promise<string[]> {
    const allFiles: { path: string; content: string; }[] = [];

    async function collectFiles(currentPath: string) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (EXCLUDE_DIRS_SCAN.has(entry.name)) continue;

                const fullPath = path.join(currentPath, entry.name);
                if (entry.isDirectory()) {
                    await collectFiles(fullPath);
                } else if (entry.isFile() && SCANNABLE_EXTENSIONS_SCAN.has(path.extname(entry.name))) {
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        allFiles.push({ path: path.relative(rootDir, fullPath), content });
                    } catch (err) {
                        console.warn(`Could not read file ${fullPath}, skipping.`);
                    }
                }
            }
        } catch (err) {
            console.error(`Could not read directory ${currentPath}`);
        }
    }

    await collectFiles(rootDir);

    const batches: string[] = [];
    let currentBatchContent = '';
    let currentBatchCharCount = 0;

    for (const file of allFiles) {
        const fileHeader = `--- FILE: ${file.path} ---\n`;
        const fileBlock = `${fileHeader}${file.content}\n\n`;
        const fileBlockCharCount = fileBlock.length;

        if (fileBlockCharCount > SAFE_CHAR_LIMIT) {
            console.warn(`Skipping file ${file.path} as it exceeds the safe token limit.`);
            continue;
        }

        if (currentBatchCharCount + fileBlockCharCount > SAFE_CHAR_LIMIT) {
            batches.push(currentBatchContent);
            currentBatchContent = fileBlock;
            currentBatchCharCount = fileBlockCharCount;
        } else {
            currentBatchContent += fileBlock;
            currentBatchCharCount += fileBlockCharCount;
        }
    }

    if (currentBatchContent.length > 0) {
        batches.push(currentBatchContent);
    }

    return batches;
}

/**
 * Performs a local-only analysis of a folder, counting files and lines of code.
 * @param rootDir The root directory to analyze.
 * @returns An object containing language statistics.
 */
export async function performLocalAnalysis(rootDir: string): Promise<{ [lang: string]: { nFiles: number, code: number } }> {
    const stats: { [lang: string]: { nFiles: number, code: number } } = {};
    let totalFiles = 0;
    let totalLines = 0;

    async function traverse(currentPath: string) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            if (EXCLUDE_DIRS_ANALYZE.has(entry.name)) continue;

            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                await traverse(fullPath);
            } else if (entry.isFile()) {
                const language = LANGUAGE_MAP_ANALYZE[path.extname(entry.name)];
                if (language) {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const lineCount = content.split('\n').length;
                    if (!stats[language]) {
                        stats[language] = { nFiles: 0, code: 0 };
                    }
                    stats[language].nFiles++;
                    stats[language].code += lineCount;
                    totalFiles++;
                    totalLines += lineCount;
                }
            }
        }
    }
    await traverse(rootDir);
    stats['SUM'] = { nFiles: totalFiles, code: totalLines };
    return stats;
}