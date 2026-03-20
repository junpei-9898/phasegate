/**
 * @layer application
 * @unit quick-mode
 *
 * H10-01: ChangedFile[]を受け取り、Quick Mode適用可否を判定してQuickModeEligibilityContractを返すUseCase
 */

import { ChangedFile } from '../../domain/value-objects/changed-file.js';
import { QuickModeJudgmentEngine } from '../../domain/services/quick-mode-judgment-engine.js';
import { QuickModeDecisionContractMapper } from '../mappers/quick-mode-decision-contract-mapper.js';
import type { ChangedFilesPort } from '../ports/changed-files-port.js';
import type { QuickModeConfigPort } from '../ports/quick-mode-config-port.js';
import type { QuickModeEligibilityContract } from '../dto/quick-mode-eligibility-contract.js';

export interface JudgeQuickModeEligibilityUseCaseInput {
  readonly changedFiles?: readonly { filePath: string; changeKind: string }[];
}

export interface JudgeQuickModeEligibilityUseCaseDeps {
  changedFilesPort: ChangedFilesPort;
  quickModeConfigPort: QuickModeConfigPort;
  judgmentEngine?: QuickModeJudgmentEngine;
}

export class JudgeQuickModeEligibilityUseCase {
  private readonly changedFilesPort: ChangedFilesPort;
  private readonly quickModeConfigPort: QuickModeConfigPort;
  private readonly judgmentEngine: QuickModeJudgmentEngine;
  private readonly mapper: QuickModeDecisionContractMapper;

  constructor(deps: JudgeQuickModeEligibilityUseCaseDeps) {
    this.changedFilesPort = deps.changedFilesPort;
    this.quickModeConfigPort = deps.quickModeConfigPort;
    this.judgmentEngine = deps.judgmentEngine ?? new QuickModeJudgmentEngine();
    this.mapper = new QuickModeDecisionContractMapper();
  }

  async execute(input: JudgeQuickModeEligibilityUseCaseInput): Promise<Readonly<QuickModeEligibilityContract>> {
    // 1. 変更ファイルの取得
    let changedFiles: readonly ChangedFile[];

    if (input.changedFiles !== undefined) {
      changedFiles = input.changedFiles.map((f) => ChangedFile.create(f));
    } else {
      changedFiles = await this.changedFilesPort.getChangedFiles();
    }

    // 2. 設定の取得
    const config = await this.quickModeConfigPort.getConfig();

    // 3. 判定の実行
    const eligibility = this.judgmentEngine.judge(changedFiles, config);

    // 4. DTO に変換して返す
    return Object.freeze(this.mapper.toEligibilityContract(eligibility));
  }
}
