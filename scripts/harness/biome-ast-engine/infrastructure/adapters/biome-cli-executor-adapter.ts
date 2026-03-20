/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import { spawnSync } from 'node:child_process';
import type { FilePath } from '../../domain/value-objects/file-path.js';
import type { BiomeExecutorPort } from '../../domain/ports/biome-executor-port.js';

export class BiomeCliExecutionError extends Error {
  constructor(
    readonly exitCode: number,
    readonly stderr: string
  ) {
    super(`biome check failed with exit code ${exitCode}: ${stderr}`);
    this.name = 'BiomeCliExecutionError';
  }
}

export interface BiomeCliExecutorAdapterDeps {
  readonly cwd: string;
  readonly biomeBin?: string;
}

/**
 * BiomeExecutorPort の実装。
 * `biome check --reporter json` をサブプロセスで実行する。
 * 終了コードが 0 以外の場合は BiomeCliExecutionError をスローする。
 * 診断結果の RuleViolation への変換は行わない。
 */
export class BiomeCliExecutorAdapter implements BiomeExecutorPort {
  private readonly cwd: string;
  private readonly biomeBin: string;

  constructor(deps: BiomeCliExecutorAdapterDeps) {
    this.cwd = deps.cwd;
    this.biomeBin = deps.biomeBin ?? 'npx';
  }

  async executeCheck(files: readonly FilePath[]): Promise<void> {
    const fileArgs = files.map((f) => f.toString());

    const isNpx = this.biomeBin === 'npx';
    const command = isNpx ? 'npx' : this.biomeBin;
    const args = isNpx
      ? ['biome', 'check', '--reporter', 'json', ...fileArgs]
      : ['check', '--reporter', 'json', ...fileArgs];

    const result = spawnSync(command, args, {
      cwd: this.cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    // exit 0 = no issues, exit 1 = lint violations found (normal result)
    // exit >= 2 = biome internal error
    const exitCode = result.status ?? 1;
    if (exitCode >= 2) {
      throw new BiomeCliExecutionError(exitCode, result.stderr ?? '');
    }
  }
}
