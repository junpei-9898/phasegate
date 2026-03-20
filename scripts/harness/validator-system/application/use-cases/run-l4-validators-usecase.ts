/**
 * @layer application
 * @unit validator-system
 *
 * RunL4ValidatorsUseCase — H08-03: L4バリデータ実行
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL4ValidatorsInput } from '../dto/run-l4-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';

export class DesignDocumentReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesignDocumentReadError';
  }
}

export interface RunL4ValidatorsUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
}

export class RunL4ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;

  constructor(deps: RunL4ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
  }

  async execute(input: RunL4ValidatorsInput): Promise<readonly ValidationResultContract[]> {
    let validatorIds: readonly ValidatorId[];
    if (input.validatorIds && input.validatorIds.length > 0) {
      validatorIds = input.validatorIds.map((id) => ValidatorId.create(id));
    } else {
      validatorIds = this.registry.listByLayer('L4').map((d) => d.validatorId);
    }

    const definitions = this.registry.select(validatorIds);

    let layerConfig;
    try {
      layerConfig = await this.configPort.getLayerConfig('L4');
    } catch (err) {
      throw new ValidatorExecutionError(`Failed to get L4 LayerConfig: ${err instanceof Error ? err.message : String(err)}`, err);
    }

    const results = this.executionService.execute(definitions, [layerConfig]);
    return this.mapper.toContracts(results);
  }
}
