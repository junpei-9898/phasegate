/**
 * @layer infrastructure
 * @unit phase2-extensions
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { DocumentAgePort } from '../../domain/ports/document-age-port.js';
import { DocumentAge } from '../../domain/value-objects/document-age.js';

function diffInDays(now: Date, past: Date): number {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((now.getTime() - past.getTime()) / millisecondsPerDay));
}

export class GitLogDocumentAgeAdapter implements DocumentAgePort {
  constructor(
    private readonly projectRoot: string,
    private readonly nowProvider: () => Date = () => new Date(),
    // WI-035: 配列引数で execFileSync を直接呼ぶことでシェル経由のメタ文字評価を遮断する。
    private readonly gitLogExecutor: (
      file: string,
      args: readonly string[],
      options: { cwd: string; stdio?: readonly ['pipe', 'pipe', 'pipe'] },
    ) => Buffer = execFileSync,
  ) {}

  async getAge(documentPath: string): Promise<DocumentAge> {
    try {
      const output = this.gitLogExecutor(
        'git',
        ['log', '--format=%ai', '-1', '--', documentPath],
        {
          cwd: this.projectRoot,
          // ISSUE-005 P1-3: fresh repo では "fatal: your current branch ... does not have
          // any commits yet" が 34回 stderr に漏れる。pipe に束ねて静音化する。
          stdio: ['pipe', 'pipe', 'pipe'] as const,
        },
      )
        .toString()
        .trim();

      if (output.length > 0) {
        return DocumentAge.create({
          ageInDays: diffInDays(this.nowProvider(), new Date(output)),
          source: 'git-log',
        });
      }
    } catch {
      // fall through
    }

    const stat = await fs.stat(path.resolve(this.projectRoot, documentPath));
    return DocumentAge.create({
      ageInDays: diffInDays(this.nowProvider(), stat.mtime),
      source: 'file-mtime',
    });
  }
}
