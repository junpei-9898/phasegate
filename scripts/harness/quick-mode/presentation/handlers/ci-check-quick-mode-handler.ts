/**
 * @layer presentation
 * @unit quick-mode
 *
 * phasegate:ci-check --quick フラグを受け取り、ExecuteQuickCiCheckUseCase を呼ぶハンドラー
 */

import { HumanQuickModeFormatter } from '../formatters/human-quick-mode-formatter.js';
import { AgentQuickModeFormatter } from '../formatters/agent-quick-mode-formatter.js';
import { JsonQuickModeFormatter } from '../formatters/json-quick-mode-formatter.js';
import type { ExecuteQuickCiCheckUseCase } from '../../application/usecases/execute-quick-ci-check-usecase.js';
import type { QuickModeRenderOptions } from '../dto/quick-mode-render-options.js';

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

    // --files 解析: カンマ区切りのファイルパスを MODIFY として扱う
    let changedFiles: { filePath: string; changeKind: string }[] | undefined;
    if (files) {
      changedFiles = files.split(',').map((p) => ({
        filePath: p.trim(),
        changeKind: 'MODIFY',
      }));
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
