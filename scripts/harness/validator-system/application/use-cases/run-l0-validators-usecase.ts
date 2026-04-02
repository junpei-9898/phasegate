/**
 * @layer application
 * @unit validator-system
 *
 * RunL0ValidatorsUseCase — L0 バリデータ実行
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidationResult } from '../../domain/value-objects/validation-result.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL0ValidatorsInput } from '../dto/run-l0-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';

export interface RunL0ValidatorsUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
}

export class RunL0ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;

  constructor(deps: RunL0ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
  }

  async execute(input: RunL0ValidatorsInput): Promise<readonly ValidationResultContract[]> {
    let validatorIds: readonly ValidatorId[];
    if (input.validatorIds && input.validatorIds.length > 0) {
      validatorIds = input.validatorIds.map((id) => ValidatorId.create(id));
    } else {
      validatorIds = this.registry.listByLayer('L0').map((d) => d.validatorId);
    }

    const definitions = this.registry.select(validatorIds);

    const layerConfig = await this.configPort.getLayerConfig('L0');
    if (!layerConfig.enabled) {
      return [];
    }

    const results = this.executionService.execute(definitions, [layerConfig]);
    const finalResults = definitions.map(
      (definition) => {
        const result = results.find((r) => r.validatorId.value === definition.validatorId.value);
        return result ?? ValidationResult.skip(definition.validatorId);
      },
    );
    return this.mapper.toContracts(finalResults);
  }
}
