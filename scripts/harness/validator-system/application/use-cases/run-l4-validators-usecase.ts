/**
 * @layer application
 * @unit validator-system
 * @work-item-id WI-107 / WI-156
 *
 * RunL4ValidatorsUseCase — H08-03: L4バリデータ実行
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidationResult } from '../../domain/value-objects/validation-result.js';
import { LayerConfig } from '../../domain/value-objects/layer-config.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL4ValidatorsInput } from '../dto/run-l4-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';
import type { DriftDetectionService } from '../../domain/services/l4/drift-detection-service.js';
import type { ConsistencyCheckService } from '../../domain/services/l4/consistency-check-service.js';
import type { DeadCodeDetectionService } from '../../domain/services/l4/dead-code-detection-service.js';
import type { ArchitectureSemanticAnalysisService } from '../../domain/services/l4/architecture-semantic-analysis-service.js';
import { SkillCatalogDriftService } from '../../domain/services/l4/skill-catalog-drift-service.js';
import type { SkillCatalogDriftPort } from '../../domain/ports/skill-catalog-drift-port.js';

interface ScheduledHarnessErrorContract {
  readonly severity: string;
  readonly message: string;
  readonly suggestion: string;
}

interface CheckDocFreshnessOutputContract {
  readonly results: readonly {
    readonly level: 'ok' | 'warn' | 'error';
    readonly message: string;
  }[];
  readonly errors: readonly ScheduledHarnessErrorContract[];
}

interface ValidateDocPointersOutputContract {
  readonly results: readonly {
    readonly documentPath: string;
    readonly pointerTarget: string;
    readonly isResolvable: boolean;
    readonly errorMessage: string | null;
  }[];
  readonly errors: readonly ScheduledHarnessErrorContract[];
}

interface CheckDocFreshnessUseCasePort {
  execute(input: { targetPattern?: string; format?: 'text' | 'json'; dryRun?: boolean }): Promise<CheckDocFreshnessOutputContract>;
}

interface ValidateDocPointersUseCasePort {
  execute(input: { targetPattern?: string; includeUrlPointers?: boolean; format?: 'text' | 'json' }): Promise<ValidateDocPointersOutputContract>;
}

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
  architectureSemanticAnalysisService?: ArchitectureSemanticAnalysisService;
  skillCatalogDriftPort?: SkillCatalogDriftPort;
  checkDocFreshnessUseCase?: CheckDocFreshnessUseCasePort;
  validateDocPointersUseCase?: ValidateDocPointersUseCasePort;
}

export class RunL4ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly driftDetectionService?: DriftDetectionService;
  private readonly consistencyCheckService?: ConsistencyCheckService;
  private readonly deadCodeDetectionService?: DeadCodeDetectionService;
  private readonly architectureSemanticAnalysisService?: ArchitectureSemanticAnalysisService;
  private readonly skillCatalogDriftPort?: SkillCatalogDriftPort;
  private readonly skillCatalogDriftService = new SkillCatalogDriftService();
  private readonly checkDocFreshnessUseCase?: CheckDocFreshnessUseCasePort;
  private readonly validateDocPointersUseCase?: ValidateDocPointersUseCasePort;

  constructor(deps: RunL4ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
    this.driftDetectionService = deps.driftDetectionService;
    this.consistencyCheckService = deps.consistencyCheckService;
    this.deadCodeDetectionService = deps.deadCodeDetectionService;
    this.architectureSemanticAnalysisService = deps.architectureSemanticAnalysisService;
    this.skillCatalogDriftPort = deps.skillCatalogDriftPort;
    this.checkDocFreshnessUseCase = deps.checkDocFreshnessUseCase;
    this.validateDocPointersUseCase = deps.validateDocPointersUseCase;
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

    if (!layerConfig.enabled && !input.forceLayerEnabled) {
      return this.mapper.toContracts(definitions.map((definition) => ValidationResult.skip(definition.validatorId)));
    }

    const effectiveLayerConfig = input.forceLayerEnabled && !layerConfig.enabled
      ? LayerConfig.create({
          layer: layerConfig.layer,
          enabled: true,
          validatorIds: layerConfig.validatorIds,
          thresholds: { ...layerConfig.thresholds },
          strictOnly: layerConfig.strictOnly,
          preset: layerConfig.preset,
        })
      : layerConfig;

    const results = this.executionService.execute(definitions, [effectiveLayerConfig]);
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
        const architectureSemanticErrors = this.architectureSemanticAnalysisService
          ? await this.architectureSemanticAnalysisService.analyze()
          : [];
        if (report.hasMismatches() || architectureSemanticErrors.length > 0) {
          overrideMap.set(
            'L4-002',
            ValidationResult.fail(ValidatorId.create('L4-002'), [...report.toHarnessErrors(), ...architectureSemanticErrors], 0),
          );
        }
      }
    }

    if (this.deadCodeDetectionService) {
      const l4003Result = overrideMap.get('L4-003');
      if (l4003Result && !l4003Result.skipped) {
        const strictOnly = input.strictMode ?? effectiveLayerConfig.strictOnly ?? false;
        const report = await this.deadCodeDetectionService.detect({ strictOnly });
        if (report.hasDeadCode()) {
          overrideMap.set(
            'L4-003',
            ValidationResult.fail(ValidatorId.create('L4-003'), [...report.toHarnessErrors()], 0),
          );
        }
      }
    }

    if (this.checkDocFreshnessUseCase) {
      const l4004Result = overrideMap.get('L4-004');
      if (l4004Result && !l4004Result.skipped) {
        const freshnessOutput = await this.checkDocFreshnessUseCase.execute({ format: 'json' });
        const errors = this.toDocFreshnessHarnessErrors(freshnessOutput);
        overrideMap.set(
          'L4-004',
          errors.length > 0
            ? ValidationResult.fail(ValidatorId.create('L4-004'), errors, 0)
            : ValidationResult.pass(ValidatorId.create('L4-004'), 0),
        );
      }
    }

    if (this.validateDocPointersUseCase) {
      const l4005Result = overrideMap.get('L4-005');
      if (l4005Result && !l4005Result.skipped) {
        const pointerOutput = await this.validateDocPointersUseCase.execute({ includeUrlPointers: false, format: 'json' });
        const errors = this.toPointerValidationHarnessErrors(pointerOutput);
        overrideMap.set(
          'L4-005',
          errors.length > 0
            ? ValidationResult.fail(ValidatorId.create('L4-005'), errors, 0)
            : ValidationResult.pass(ValidatorId.create('L4-005'), 0),
        );
      }
    }

    if (this.skillCatalogDriftPort) {
      const l4006Result = overrideMap.get('L4-006');
      if (l4006Result && !l4006Result.skipped) {
        const snapshot = await this.skillCatalogDriftPort.collect();
        const report = this.skillCatalogDriftService.check(snapshot);
        overrideMap.set(
          'L4-006',
          report.hasFindings()
            ? ValidationResult.fail(ValidatorId.create('L4-006'), report.toHarnessErrors(), 0)
            : ValidationResult.pass(ValidatorId.create('L4-006'), 0),
        );
      }
    }

    const finalResults = definitions.map(
      (definition) => overrideMap.get(definition.validatorId.value) ?? ValidationResult.skip(definition.validatorId),
    );
    return this.mapper.toContracts(finalResults);
  }

  private toDocFreshnessHarnessErrors(output: CheckDocFreshnessOutputContract): readonly ValidationResult['errors'][number][] {
    const executionErrors = output.errors.map((error) => this.toHarnessErrorLike(
      'L4-004',
      error.severity,
      error.message,
      error.suggestion,
    ));
    const freshnessFindings = output.results
      .filter((result) => result.level !== 'ok')
      .map((result) => this.toHarnessErrorLike(
        'L4-004',
        result.level === 'error' ? 'error' : 'warning',
        result.message,
        'Review the document freshness threshold or update the design document.',
      ));

    return [...executionErrors, ...freshnessFindings];
  }

  private toPointerValidationHarnessErrors(output: ValidateDocPointersOutputContract): readonly ValidationResult['errors'][number][] {
    const executionErrors = output.errors.map((error) => this.toHarnessErrorLike(
      'L4-005',
      error.severity,
      error.message,
      error.suggestion,
    ));
    const brokenPointers = output.results
      .filter((result) => !result.isResolvable)
      .map((result) => this.toHarnessErrorLike(
        'L4-005',
        'warning',
        `${result.documentPath} has an unresolved pointer to ${result.pointerTarget}`,
        result.errorMessage ?? 'Fix or remove the pointer target.',
      ));

    return [...executionErrors, ...brokenPointers];
  }

  private toHarnessErrorLike(
    code: string,
    severity: string,
    message: string,
    suggestion: string,
  ): ValidationResult['errors'][number] {
    return {
      code: { value: code, toString: () => code },
      severity: { value: severity, toString: () => severity },
      message,
      suggestion,
    };
  }
}
