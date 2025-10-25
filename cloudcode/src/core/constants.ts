// src/core/constants.ts

// The base URL for the backend analysis server.
export const API_BASE_URL = 'http://127.0.0.1:5000';

// Configuration for the 'Analyze Project' (local-only) feature.
export const LANGUAGE_MAP_ANALYZE: { [key: string]: string } = {
    '.js': 'JavaScript', '.jsx': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.py': 'Python', '.java': 'Java', '.cs': 'C#', '.cpp': 'C++', '.h': 'C++',
    '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.json': 'JSON', '.md': 'Markdown',
    '.yml': 'YAML', '.yaml': 'YAML', '.xml': 'XML', '.gitignore': 'Ignore'
};
export const EXCLUDE_DIRS_ANALYZE = new Set(['node_modules', 'venv', '.venv', '.git', 'dist', 'out', 'build', '.vscode', '__pycache__']);

// Configuration for the 'Security Scan' feature.
export const SCANNABLE_EXTENSIONS_SCAN = new Set(['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.cs', '.php', '.rb', '.html']);
export const EXCLUDE_DIRS_SCAN = new Set(['node_modules', 'venv', '.venv', '.git', 'dist', 'out', 'build', '.vscode', '__pycache__', 'target', 'bin']);

// Configuration for batching code to send to the AI model.
// A conservative estimation: 1 token is roughly 4 characters.
// We aim for batches under a safe limit to avoid exceeding the model's context window.
const CHAR_TO_TOKEN_RATIO = 4;
const SAFE_TOKEN_LIMIT = 100000;
export const SAFE_CHAR_LIMIT = SAFE_TOKEN_LIMIT * CHAR_TO_TOKEN_RATIO;