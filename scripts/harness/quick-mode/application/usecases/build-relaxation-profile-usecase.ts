/**
 * @layer application
 * @unit quick-mode
 *
 * H10-02: eligible=trueが確定した場合にValidatorRelaxationProfileを生成して返すUseCase
 */

import { ValidatorRelaxationService } from '../../domain/services/validator-relaxation-service.js';
import { QuickModeConfig } from '../../domain/value-objects/quick-mode-config.js';
import { QuickModeDecisionContractMapper } from '../mappers/quick-mode-decision-contract-mapper.js';
import type { QuickModeConfigPort } from '../ports/quick-mode-config-port.js';
import type { ValidatorIdRegistryPort } from '../ports/validator-id-registry-port.js';
import type { QuickModeEligibilityContract } from '../dto/quick-mode-eligibility-contract.js';
import type { ValidatorRelaxationProfileContract } from '../dto/validator-relaxation-profile-contract.js';

export class QuickModeNotEligibleError extends Error {
  constructor() {
    super('Cannot build relaxation profile: Quick Mode is not eligible');
    this.name = 'QuickModeNotEligibleError';
  }
}

export interface BuildRelaxationProfileUseCaseInput {
  readonly eligibilityContract: QuickModeEligibilityContract;
}

// IT テストでの eligibility キー名にも対応
export interface BuildRelaxationProfileUseCaseInputAlt {
  readonly eligibility: QuickModeEligibilityContract;
}

export interface BuildRelaxationProfileUseCaseDeps {
  quickModeConfigPort: QuickModeConfigPort;
  validatorIdRegistryPort: ValidatorIdRegistryPort;
  relaxationService?: ValidatorRelaxationService;
}

export class BuildRelaxationProfileUseCase {
  private readonly quickModeConfigPort: QuickModeConfigPort;
  private readonly validatorIdRegistryPort: ValidatorIdRegistryPort;
  private readonly relaxationService: ValidatorRelaxationService;
  private readonly mapper: QuickModeDecisionContractMapper;

  constructor(deps: BuildRelaxationProfileUseCaseDeps) {
    this.quickModeConfigPort = deps.quickModeConfigPort;
    this.validatorIdRegistryPort = deps.validatorIdRegistryPort;
    this.relaxationService = deps.relaxationService ?? new ValidatorRelaxationService();
    this.mapper = new QuickModeDecisionContractMapper();
  }

  async execute(
    input: BuildRelaxationProfileUseCaseInput | BuildRelaxationProfileUseCaseInputAlt
  ): Promise<Readonly<ValidatorRelaxationProfileContract>> {
    // eligibilityContract または eligibility キーに対応
    const eligibilityContract =
      'eligibilityContract' in input ? input.eligibilityContract : input.eligibility;

    // 1. eligible=false の場合は早期エラー
    if (!eligibilityContract.eligible) {
      throw new QuickModeNotEligibleError();
    }

    // 2. 設定の取得
    const config = await this.quickModeConfigPort.getConfig();

    // 3. 全 ValidatorId の取得
    const allValidatorIds = await this.validatorIdRegistryPort.getAllIds();

    // 4. 緩和プロファイルの生成
    const profile = this.relaxationService.build(config, allValidatorIds);

    // 5. DTO に変換して返す（再帰的 freeze）
    const contract = this.mapper.toRelaxationProfileContract(profile);
    return Object.freeze(contract);
  }
}
