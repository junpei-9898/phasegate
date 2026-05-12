/**
 * @layer infrastructure
 * @unit phase2-extensions
 * @work-item-id WI-035
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { InitialCreationAgePort } from '../../domain/ports/initial-creation-age-port.js';
import { InitialCreationAge } from '../../domain/value-objects/initial-creation-age.js';

// WI-035: 配列引数で execFileSync を直接呼ぶことでシェル経由のメタ文字評価を遮断する。
type GitExecutor = (
  file: string,
  args: readonly string[],
  options: { cwd: string; stdio?: readonly ['pipe', 'pipe', 'pipe'] },
) => Buffer;

function diffInDays(now: Date, past: Date): number {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((now.getTime() - past.getTime()) / millisecondsPerDay));
}

export class GitLogInitialCreationAgeAdapter implements InitialCreationAgePort {
  constructor(
    private readonly projectRoot: string,
    private readonly nowProvider: () => Date = () => new Date(),
    private readonly gitExecutor: GitExecutor = execFileSync,
  ) {}

  async getAge(filePath: string): Promise<InitialCreationAge> {
    const dateOutput = this.runGit(['log', '--diff-filter=A', '--format=%ai', '--', filePath]);
    const countOutput = this.runGit(['rev-list', '--count', 'HEAD', '--', filePath]);

    if (dateOutput !== null && dateOutput.length > 0) {
      const commitCount = this.parseCount(countOutput);

      return InitialCreationAge.create({
        ageInDays: diffInDays(this.nowProvider(), new Date(dateOutput.split('\n')[0].trim())),
        commitCount: commitCount > 0 ? commitCount : 1,
        source: 'git-log',
      });
    }

    return this.fileMtimeFallback(filePath);
  }

  private runGit(args: readonly string[]): string | null {
    try {
      return this.gitExecutor('git', args, {
        cwd: this.projectRoot,
        // ISSUE-005 P1-3 と同様に、fresh repo の fatal stderr を静音化する。
        stdio: ['pipe', 'pipe', 'pipe'] as const,
      })
        .toString()
        .trim();
    } catch {
      return null;
    }
  }

  private parseCount(output: string | null): number {
    if (output === null || output.length === 0) {
      return 1;
    }

    const parsed = Number.parseInt(output.trim(), 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  }

  private async fileMtimeFallback(filePath: string): Promise<InitialCreationAge> {
    const stat = await fs.stat(path.resolve(this.projectRoot, filePath));

    return InitialCreationAge.create({
      ageInDays: diffInDays(this.nowProvider(), stat.mtime),
      commitCount: 1,
      source: 'file-mtime',
    });
  }
}
