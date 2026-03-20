/**
 * @layer application
 * @unit validator-system
 *
 * RunQuickModeUseCase — H08-04: Quickモード緩和実行
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunQuickModeInput } from '../dto/run-quick-mode-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';

export class InvalidRelaxationProfileError extends Error {
  constructor(message: string) {
    super(`Invalid relaxation profile: ${message}`);
    this.name = 'InvalidRelaxationProfileError';
  }
}

export interface RunQuickModeUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
}

export class RunQuickModeUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;

  constructor(deps: RunQuickModeUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
  }

  async execute(input: RunQuickModeInput): Promise<readonly ValidationResultContract[]> {
    const { relaxationProfile } = input;

    // L4は常にスキップの不変条件チェック
    if (relaxationProfile.l4.all !== false) {
      throw new InvalidRelaxationProfileError('l4.all must be false in quick mode');
    }

    const l2Ids = relaxationProfile.l2.maintained.map((id) => ValidatorId.create(id));
    const l3Ids = relaxationProfile.l3.maintained.map((id) => ValidatorId.create(id));
    const allIds = [...l2Ids, ...l3Ids];

    const definitions = this.registry.select(allIds);

    // L2・L3 LayerConfig取得
    let l2Config, l3Config;
    try {
      [l2Config, l3Config] = await Promise.all([
        this.configPort.getLayerConfig('L2'),
        this.configPort.getLayerConfig('L3'),
      ]);
    } catch (err) {
      throw new ValidatorExecutionError(`Failed to get LayerConfig: ${err instanceof Error ? err.message : String(err)}`, err);
    }

    const results = this.executionService.execute(definitions, [l2Config, l3Config]);

    // skipped バリデータの結果を追加
    const skippedL2 = relaxationProfile.l2.skipped;
    const skippedL3 = relaxationProfile.l3.skipped;
    const skippedContracts: ValidationResultContract[] = [];

    for (const id of [...skippedL2, ...skippedL3]) {
      try {
        const vid = ValidatorId.create(id);
        skippedContracts.push({
          validatorId: vid.value,
          passed: true,
          errors: [],
          durationMs: 0,
          skipped: true,
        });
      } catch {
        // 無効IDはスキップ
      }
    }

    return [...this.mapper.toContracts(results), ...skippedContracts];
  }
}
