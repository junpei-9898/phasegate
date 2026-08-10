// @unit installation
// @layer infrastructure
// @work-item-id WI-390

import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { HuskyRuntimeState } from '../../domain/husky-runtime-state.js';
import type { GitHooksRuntimeProbe } from '../../domain/ports/git-hooks-runtime-probe.js';

const execFileAsync = promisify(execFile);
const HUSKY_V9_SHIMS = ['h', 'pre-commit', 'commit-msg', 'pre-push'] as const;

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function normalizeHooksPath(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

export class GitHooksRuntimeProbeAdapter implements GitHooksRuntimeProbe {
  async probe(projectRoot: string): Promise<HuskyRuntimeState> {
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync('git', ['-C', projectRoot, 'config', '--get', 'core.hooksPath']));
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
      if (code === 1) {
        return HuskyRuntimeState.inactive('hooks-path-unset', null);
      }
      return HuskyRuntimeState.unavailable(error instanceof Error ? error.message : String(error));
    }

    const hooksPath = normalizeHooksPath(stdout);
    if (hooksPath.length === 0) {
      return HuskyRuntimeState.inactive('hooks-path-unset', null);
    }
    if (hooksPath !== '.husky' && hooksPath !== '.husky/_') {
      return HuskyRuntimeState.inactive('hooks-path-unsupported', hooksPath);
    }

    if (hooksPath === '.husky') {
      return (await pathExists(join(projectRoot, '.husky')))
        ? HuskyRuntimeState.active('.husky')
        : HuskyRuntimeState.inactive('shim-missing', hooksPath);
    }

    const shimsPresent = await Promise.all(
      HUSKY_V9_SHIMS.map((shim) => pathExists(join(projectRoot, '.husky', '_', shim))),
    );
    return shimsPresent.every(Boolean)
      ? HuskyRuntimeState.active('.husky/_')
      : HuskyRuntimeState.inactive('shim-missing', hooksPath);
  }
}
