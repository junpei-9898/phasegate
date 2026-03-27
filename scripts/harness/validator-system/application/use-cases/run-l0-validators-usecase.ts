/**
 * @layer application
 * @unit validator-system
 *
 * RunL0ValidatorsUseCase — L0 FUSE フック設定バリデータ実行
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidationResult, type HarnessErrorLike } from '../../domain/value-objects/validation-result.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL0ValidatorsInput } from '../dto/run-l0-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';

export interface FuseHookConfigValidatorPort {
  validateConfig(hookConfigPath: string): Promise<{
    passed: boolean;
    errors: readonly HarnessErrorLike[];
  }>;
}

export interface FuseMountStatusPort {
  checkStatus(): Promise<{
    available: boolean;
    errors: readonly HarnessErrorLike[];
  }>;
}

export interface RunL0ValidatorsUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
  fuseHookConfigValidatorPort?: FuseHookConfigValidatorPort;
  fuseMountStatusPort?: FuseMountStatusPort;
}

export class RunL0ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly fuseHookConfigValidatorPort?: FuseHookConfigValidatorPort;
  private readonly fuseMountStatusPort?: FuseMountStatusPort;

  constructor(deps: RunL0ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
    this.fuseHookConfigValidatorPort = deps.fuseHookConfigValidatorPort;
    this.fuseMountStatusPort = deps.fuseMountStatusPort;
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
    const overrideMap = new Map<string, ValidationResult>(
      results.map((result) => [result.validatorId.value, result]),
    );

    // L0-001: FUSE hook config validation
    if (this.fuseHookConfigValidatorPort) {
      const l0001Result = overrideMap.get('L0-001');
      if (l0001Result && !l0001Result.skipped) {
        const configResult = await this.fuseHookConfigValidatorPort.validateConfig(
          input.hookConfigPath ?? '.harness-hooks.yml',
        );
        if (!configResult.passed) {
          overrideMap.set(
            'L0-001',
            ValidationResult.fail(ValidatorId.create('L0-001'), [...configResult.errors], 0),
          );
        }
      }
    }

    // L0-002: FUSE mount status check
    if (this.fuseMountStatusPort) {
      const l0002Result = overrideMap.get('L0-002');
      if (l0002Result && !l0002Result.skipped) {
        const statusResult = await this.fuseMountStatusPort.checkStatus();
        if (!statusResult.available) {
          overrideMap.set(
            'L0-002',
            ValidationResult.fail(ValidatorId.create('L0-002'), [...statusResult.errors], 0),
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
