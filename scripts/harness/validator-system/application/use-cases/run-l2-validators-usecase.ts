/**
 * @layer application
 * @unit validator-system
 *
 * RunL2ValidatorsUseCase — H08-01: L2バリデータ実行
 */
import { ValidatorId, InvalidValidatorIdError } from '../../domain/value-objects/validator-id.js';
import { ValidationResult, type HarnessErrorLike } from '../../domain/value-objects/validation-result.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL2ValidatorsInput } from '../dto/run-l2-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';

export interface RunL2ValidatorsUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
}

export class RunL2ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;

  constructor(deps: RunL2ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
  }

  async execute(input: RunL2ValidatorsInput): Promise<readonly ValidationResultContract[]> {
    // バリデータID解決
    let validatorIds: readonly ValidatorId[];
    if (input.validatorIds && input.validatorIds.length > 0) {
      validatorIds = input.validatorIds.map((id) => ValidatorId.create(id));
    } else {
      validatorIds = this.registry.listByLayer('L2').map((d) => d.validatorId);
    }

    const definitions = this.registry.select(validatorIds);

    // LayerConfig取得
    let layerConfig;
    try {
      layerConfig = await this.configPort.getLayerConfig('L2');
    } catch (err) {
      throw new ValidatorExecutionError(`Failed to get L2 LayerConfig: ${err instanceof Error ? err.message : String(err)}`, err);
    }

    const results = this.executionService.execute(definitions, [layerConfig]);
    return this.mapper.toContracts(results);
  }
}
