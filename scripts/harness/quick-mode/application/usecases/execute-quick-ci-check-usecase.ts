/**
 * @layer application
 * @unit quick-mode
 *
 * H10-03: harness:ci-check --quick の実行フロー全体を調停するUseCase
 */

import type { JudgeQuickModeEligibilityUseCase } from './judge-quick-mode-eligibility-usecase.js';
import type { BuildRelaxationProfileUseCase } from './build-relaxation-profile-usecase.js';
import type { ValidatorExecutionPort } from '../ports/validator-execution-port.js';
import type { QuickModeDecisionContract } from '../dto/quick-mode-decision-contract.js';

export interface ExecuteQuickCiCheckUseCaseInput {
  readonly changedFiles?: readonly { filePath: string; changeKind: string }[];
  readonly dryRun?: boolean;
}

export interface ExecuteQuickCiCheckUseCaseDeps {
  judgeUseCase: Pick<JudgeQuickModeEligibilityUseCase, 'execute'>;
  buildUseCase: Pick<BuildRelaxationProfileUseCase, 'execute'>;
  validatorExecutionPort?: ValidatorExecutionPort;
}

export class ExecuteQuickCiCheckUseCase {
  private readonly judgeUseCase: Pick<JudgeQuickModeEligibilityUseCase, 'execute'>;
  private readonly buildUseCase: Pick<BuildRelaxationProfileUseCase, 'execute'>;
  private readonly validatorExecutionPort: ValidatorExecutionPort | undefined;

  constructor(deps: ExecuteQuickCiCheckUseCaseDeps) {
    this.judgeUseCase = deps.judgeUseCase;
    this.buildUseCase = deps.buildUseCase;
    this.validatorExecutionPort = deps.validatorExecutionPort;
  }

  async execute(input: ExecuteQuickCiCheckUseCaseInput): Promise<Readonly<QuickModeDecisionContract>> {
    const { changedFiles, dryRun = false } = input;

    // 1. H10-01: 適用可否判定
    const eligibility = await this.judgeUseCase.execute({ changedFiles });

    // 2. eligible=false の場合は早期リターン
    if (!eligibility.eligible) {
      return Object.freeze({
        eligibility,
        relaxationProfile: undefined,
      });
    }

    // 3. H10-02: 緩和プロファイル生成
    const relaxationProfile = await this.buildUseCase.execute({ eligibilityContract: eligibility });

    // 4. dryRun=false の場合は validator-system に緩和プロファイルを渡す
    if (!dryRun && this.validatorExecutionPort) {
      await this.validatorExecutionPort.executeWithProfile(relaxationProfile);
    }

    // 5. 統合 DTO を返す
    return Object.freeze({
      eligibility,
      relaxationProfile,
    });
  }
}
