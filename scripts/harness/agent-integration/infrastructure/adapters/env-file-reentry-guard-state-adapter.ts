/**
 * @layer infrastructure
 * @unit agent-integration
 *
 * EnvFileReentryGuardStateAdapter
 * ReentryGuardStatePort の実装。環境変数またはtmpファイルで状態を管理する
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ReentryGuardStatePort } from '../../domain/ports/reentry-guard-state-port.js';

const ENV_VAR_NAME = 'HARNESS_STOP_HOOK_ACTIVE';
const TMP_FILE_NAME = 'stop_hook_active';

function getTmpFilePath(): string {
  const tmpDir = process.env['TMPDIR'] ?? '/tmp';
  return path.join(tmpDir, TMP_FILE_NAME);
}

export class EnvFileReentryGuardStateAdapter implements ReentryGuardStatePort {
  private readonly strategy: 'env' | 'file';

  constructor(options: { strategy?: 'env' | 'file' } = {}) {
    this.strategy = options.strategy ?? 'env';
  }

  async readActive(): Promise<boolean> {
    if (this.strategy === 'env') {
      return process.env[ENV_VAR_NAME] === '1';
    }

    // file strategy
    try {
      await fs.access(getTmpFilePath());
      return true;
    } catch {
      return false;
    }
  }

  async writeActive(): Promise<void> {
    if (this.strategy === 'env') {
      process.env[ENV_VAR_NAME] = '1';
      return;
    }

    // file strategy
    const tmpPath = getTmpFilePath();
    await fs.writeFile(tmpPath, '', 'utf8');
  }

  async clearActive(): Promise<void> {
    if (this.strategy === 'env') {
      delete process.env[ENV_VAR_NAME];
      return;
    }

    // file strategy
    const tmpPath = getTmpFilePath();
    try {
      await fs.rm(tmpPath, { force: true });
    } catch {
      // force オプションで ENOENT は無視されるが念のため
    }
  }
}
