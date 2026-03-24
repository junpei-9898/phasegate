/**
 * @layer application
 * @unit validator-system
 *
 * RunL2ValidatorsUseCase — H08-01: L2バリデータ実行
 */
import { readFile } from 'node:fs/promises';
import { ValidatorId, InvalidValidatorIdError } from '../../domain/value-objects/validator-id.js';
import { ValidationResult, type HarnessErrorLike } from '../../domain/value-objects/validation-result.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL2ValidatorsInput } from '../dto/run-l2-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';
import type { PhaseGatePolicyPort } from '../../domain/ports/phase-gate-policy-port.js';
import type { MetadataPolicyPort } from '../../domain/ports/metadata-policy-port.js';
import type { TestQualityAnalyzerPort } from '../../domain/ports/test-quality-analyzer-port.js';

export interface RunL2ValidatorsUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
  phaseGatePolicyPort?: PhaseGatePolicyPort;
  metadataPolicyPort?: MetadataPolicyPort;
  testQualityAnalyzerPort?: TestQualityAnalyzerPort;
}

export class RunL2ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly phaseGatePolicyPort?: PhaseGatePolicyPort;
  private readonly metadataPolicyPort?: MetadataPolicyPort;
  private readonly testQualityAnalyzerPort?: TestQualityAnalyzerPort;

  constructor(deps: RunL2ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
    this.phaseGatePolicyPort = deps.phaseGatePolicyPort;
    this.metadataPolicyPort = deps.metadataPolicyPort;
    this.testQualityAnalyzerPort = deps.testQualityAnalyzerPort;
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
    const overrideMap = new Map<string, ValidationResult>(results.map((result) => [result.validatorId.value, result]));

    if (this.phaseGatePolicyPort) {
      const l2001Result = overrideMap.get('L2-001');
      if (l2001Result && !l2001Result.skipped) {
        const policyResult = await this.phaseGatePolicyPort.checkPrerequisites({
          unitName: input.unitName,
          currentPhase: input.currentPhase,
        });
        if (!policyResult.satisfied) {
          overrideMap.set(
            'L2-001',
            ValidationResult.fail(
              ValidatorId.create('L2-001'),
              [...policyResult.violations],
              0,
            ),
          );
        }
      }
    }

    if (this.metadataPolicyPort) {
      const l2002Result = overrideMap.get('L2-002');
      if (l2002Result && !l2002Result.skipped) {
        const allErrors: HarnessErrorLike[] = [];
        for (const filePath of input.targetPaths) {
          try {
            const fileContent = await readFile(filePath, 'utf-8');
            const policyResult = await this.metadataPolicyPort.validateMetadata({ filePath, fileContent });
            if (!policyResult.passed) {
              allErrors.push(...policyResult.errors);
            }
          } catch {
            // skip unreadable files
          }
        }
        if (allErrors.length > 0) {
          overrideMap.set('L2-002', ValidationResult.fail(ValidatorId.create('L2-002'), allErrors, 0));
        }
      }
    }

    if (this.testQualityAnalyzerPort) {
      const l2003Result = overrideMap.get('L2-003');
      if (l2003Result && !l2003Result.skipped) {
        const analysisResult = await this.testQualityAnalyzerPort.analyzeTestFiles(input.targetPaths);
        const allViolations: HarnessErrorLike[] = analysisResult.results
          .filter((r) => !r.passed)
          .flatMap((r) => [...r.violations]);
        if (allViolations.length > 0) {
          overrideMap.set('L2-003', ValidationResult.fail(ValidatorId.create('L2-003'), allViolations, 0));
        }
      }
    }

    const finalResults = definitions.map(
      (definition) => overrideMap.get(definition.validatorId.value) ?? ValidationResult.skip(definition.validatorId),
    );
    return this.mapper.toContracts(finalResults);
  }
}
