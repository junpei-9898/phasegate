/**
 * @layer presentation
 * @unit quick-mode
 *
 * phasegate:ci-check --quick フラグを受け取り、ExecuteQuickCiCheckUseCase を呼ぶハンドラー
 */

import * as childProcess from 'node:child_process';
import { existsSync } from 'node:fs';
import { HumanQuickModeFormatter } from '../formatters/human-quick-mode-formatter.js';
import { AgentQuickModeFormatter } from '../formatters/agent-quick-mode-formatter.js';
import { JsonQuickModeFormatter } from '../formatters/json-quick-mode-formatter.js';
import type { ExecuteQuickCiCheckUseCase } from '../../application/usecases/execute-quick-ci-check-usecase.js';
import type { QuickModeRenderOptions } from '../dto/quick-mode-render-options.js';

/**
 * `--files` で列挙されたパスの変更種別 (CREATE/MODIFY) を推定する。
 *
 * WI: 以前は無条件で MODIFY 固定だったため、新規 domain/ ファイルが
 * NEW_DOMAIN 判定を回避して quick mode をすり抜けていた。git のステージ状態を
 * 参照し、追加 (A) なら CREATE、それ以外は MODIFY とする。git 情報が取れない
 * 場合は「ファイルが未追跡（作業ツリーにのみ存在しコミット履歴に無い）」を
 * CREATE のヒューリスティックとして用いる。
 */
function resolveChangeKind(filePath: string): 'CREATE' | 'MODIFY' {
  const gitStatus = readGitStatus(filePath);
  if (gitStatus === 'A') return 'CREATE';
  if (gitStatus !== null) return 'MODIFY';
  return isUntrackedNewFile(filePath) ? 'CREATE' : 'MODIFY';
}

function readGitStatus(filePath: string): string | null {
  try {
    const output = childProcess.execSync(
      `git diff --name-status --cached -- ${JSON.stringify(filePath)}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    ) as string;
    const line = output.trim().split('\n').find((l) => l.trim().length > 0);
    return line ? (line.split('\t')[0]?.trim() ?? null) : null;
  } catch {
    return null;
  }
}

function isUntrackedNewFile(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  try {
    childProcess.execSync(
      `git ls-files --error-unmatch -- ${JSON.stringify(filePath)}`,
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return false; // tracked → 既存ファイル
  } catch {
    return true; // 未追跡 → 新規ファイル
  }
}

export interface CiCheckQuickModeHandlerDeps {
  useCase: Pick<ExecuteQuickCiCheckUseCase, 'execute'>;
}

export class CiCheckQuickModeHandler {
  private readonly useCase: Pick<ExecuteQuickCiCheckUseCase, 'execute'>;

  constructor(deps: CiCheckQuickModeHandlerDeps) {
    this.useCase = deps.useCase;
  }

  async handle(options: QuickModeRenderOptions): Promise<void> {
    const { files, dryRun = false, format = 'human', failOnReject = false } = options;

    // --files 解析: カンマ区切りのファイルパスを git ステージ状態から
    // CREATE/MODIFY へ分類する（新規 domain/ ファイルの NEW_DOMAIN 判定のため）
    let changedFiles: { filePath: string; changeKind: string }[] | undefined;
    if (files) {
      changedFiles = files
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((filePath) => ({ filePath, changeKind: resolveChangeKind(filePath) }));
    }

    let decision: Awaited<ReturnType<typeof this.useCase.execute>>;

    try {
      decision = await this.useCase.execute({ changedFiles, dryRun });
    } catch (err) {
      process.exit(2);
      return; // TypeScript フロー解析のため
    }

    // フォーマット選択と出力
    let output: string;
    if (format === 'json') {
      output = new JsonQuickModeFormatter().format(decision);
    } else if (format === 'agent') {
      output = new AgentQuickModeFormatter().format(decision);
    } else {
      output = new HumanQuickModeFormatter().format(decision);
    }

    process.stdout.write(output);

    // 終了コード決定
    if (failOnReject && !decision.eligibility.eligible) {
      process.exit(1);
    }
  }
}
