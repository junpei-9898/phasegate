/**
 * @layer infrastructure
 * @unit quick-mode
 *
 * git diff から ChangedFile[] を取得する Adapter
 */

import * as childProcess from 'node:child_process';
import * as path from 'node:path';
import { ChangedFile } from '../../domain/value-objects/changed-file.js';
import type { ChangeKind } from '../../domain/types/change-kind.js';

export class GitNotAvailableError extends Error {
  constructor(message: string) {
    super(`Git is not available: ${message}`);
    this.name = 'GitNotAvailableError';
  }
}

export class GitCommandError extends Error {
  constructor(message: string) {
    super(`Git command failed: ${message}`);
    this.name = 'GitCommandError';
  }
}

function mapGitStatus(status: string): ChangeKind {
  if (status === 'A') return 'CREATE';
  if (status === 'D') return 'DELETE';
  if (status.startsWith('R')) return 'MODIFY';
  return 'MODIFY'; // M and others
}

function normalizePath(filePath: string): string {
  // path.normalize で ./ や ../ を解決し、先頭の ./ を除去
  const normalized = path.normalize(filePath);
  // Windows対応のため / に統一
  return normalized.replace(/\\/g, '/').replace(/^\.\//, '');
}

export class GitDiffChangedFilesAdapter {
  getChangedFiles(): readonly ChangedFile[] {
    let output: string;

    try {
      output = childProcess.execSync('git diff --name-status --cached HEAD', {
        encoding: 'utf8',
      }) as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('git: command not found') ||
        message.includes('not a git repository') ||
        message.includes('not found')
      ) {
        throw new GitNotAvailableError(message);
      }
      throw new GitCommandError(message);
    }

    if (!output || !output.trim()) {
      return [];
    }

    const lines = output.trim().split('\n');
    const files: ChangedFile[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split('\t');
      const status = parts[0];

      let filePath: string;
      if (status.startsWith('R') && parts.length >= 3) {
        // Rename: R100\told.ts\tnew.ts → 移動先を使用
        filePath = parts[2];
      } else {
        filePath = parts[1];
      }

      if (!filePath) continue;

      const changeKind = mapGitStatus(status);
      const normalizedPath = normalizePath(filePath);

      files.push(ChangedFile.create({ filePath: normalizedPath, changeKind }));
    }

    return Object.freeze(files);
  }
}
