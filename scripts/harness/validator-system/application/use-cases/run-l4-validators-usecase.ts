/**
 * @layer application
 * @unit validator-system
 *
 * RunL4ValidatorsUseCase — H08-03: L4バリデータ実行
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidationResult } from '../../domain/value-objects/validation-result.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL4ValidatorsInput } from '../dto/run-l4-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';
import type { DriftDetectionService } from '../../domain/services/l4/drift-detection-service.js';
import type { ConsistencyCheckService } from '../../domain/services/l4/consistency-check-service.js';
import type { DeadCodeDetectionService } from '../../domain/services/l4/dead-code-detection-service.js';

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
  driftDetectionService?: DriftDetectionService;
  consistencyCheckService?: ConsistencyCheckService;
  deadCodeDetectionService?: DeadCodeDetectionService;
}

export class RunL4ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly driftDetectionService?: DriftDetectionService;
  private readonly consistencyCheckService?: ConsistencyCheckService;
  private readonly deadCodeDetectionService?: DeadCodeDetectionService;

  constructor(deps: RunL4ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
    this.driftDetectionService = deps.driftDetectionService;
    this.consistencyCheckService = deps.consistencyCheckService;
    this.deadCodeDetectionService = deps.deadCodeDetectionService;
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

    if (!layerConfig.enabled) {
      return [];
    }

    const results = this.executionService.execute(definitions, [layerConfig]);
    const overrideMap = new Map<string, ValidationResult>(results.map((result) => [result.validatorId.value, result]));

    if (this.driftDetectionService) {
      const l4001Result = overrideMap.get('L4-001');
      if (l4001Result && !l4001Result.skipped) {
        const driftReports = await this.driftDetectionService.detect(input.targetUnits ? [...input.targetUnits] : undefined);
        if (driftReports.length > 0) {
          overrideMap.set(
            'L4-001',
            ValidationResult.fail(
              ValidatorId.create('L4-001'),
              driftReports.map((r) => r.toHarnessError()),
              0,
            ),
          );
        }
      }
    }

    if (this.consistencyCheckService) {
      const l4002Result = overrideMap.get('L4-002');
      if (l4002Result && !l4002Result.skipped) {
        const report = await this.consistencyCheckService.check(input.targetUnits ? [...input.targetUnits] : undefined);
        if (report.hasMismatches()) {
          overrideMap.set(
            'L4-002',
            ValidationResult.fail(ValidatorId.create('L4-002'), [...report.toHarnessErrors()], 0),
          );
        }
      }
    }

    if (this.deadCodeDetectionService) {
      const l4003Result = overrideMap.get('L4-003');
      if (l4003Result && !l4003Result.skipped) {
        const strictOnly = input.strictMode ?? layerConfig.strictOnly ?? false;
        const report = await this.deadCodeDetectionService.detect({ strictOnly });
        if (report.hasDeadCode()) {
          overrideMap.set(
            'L4-003',
            ValidationResult.fail(ValidatorId.create('L4-003'), [...report.toHarnessErrors()], 0),
          );
        }
      }
    }

    const finalResults = definitions.map(
      (definition) => overrideMap.get(definition.validatorId.value) ?? ValidationResult.skip(definition.validatorId),
    );
    return this.mapper.toContracts(finalResults);
  }
}
