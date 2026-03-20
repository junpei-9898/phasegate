/**
 * @layer composition-root
 * @unit validator-system
 *
 * DI 組み立て — validator-system の全依存関係を構築する
 */
import { ValidatorId } from './domain/value-objects/validator-id.js';
import { ValidatorDefinition } from './domain/value-objects/validator-definition.js';
import { ValidationRule } from './domain/value-objects/validation-rule.js';
import { ValidatorRegistry } from './domain/services/validator-registry.js';
import { ValidatorExecutionService } from './domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from './application/mappers/validation-result-contract-mapper.js';
import { RunL2ValidatorsUseCase } from './application/use-cases/run-l2-validators-usecase.js';
import { RunL3ValidatorsUseCase } from './application/use-cases/run-l3-validators-usecase.js';
import { RunL4ValidatorsUseCase } from './application/use-cases/run-l4-validators-usecase.js';
import { RunQuickModeUseCase } from './application/use-cases/run-quick-mode-usecase.js';
import { AggregateValidationResultsUseCase } from './application/use-cases/aggregate-validation-results-usecase.js';
import { RunFullValidationUseCase } from './application/use-cases/run-full-validation-usecase.js';
import { HarnessConfigValidatorConfigAdapter } from './infrastructure/adapters/harness-config-validator-config-adapter.js';
import { RunValidatorsHandler } from './presentation/handlers/run-validators-handler.js';
import { RunQuickModeHandler } from './presentation/handlers/run-quick-mode-handler.js';
import { ReportValidationResultsHandler } from './presentation/handlers/report-validation-results-handler.js';

/** デフォルト設定（ハードコード fallback） */
const DEFAULT_CONFIG = {
  preset: 'standard' as const,
  layers: {
    L2: { enabled: true, validators: ['L2-001', 'L2-002', 'L2-003'] },
    L3: { enabled: true, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'], coverageThreshold: 90, bundleSizeLimit: 512000 },
    L4: { enabled: true, validators: ['L4-001', 'L4-002', 'L4-003'] },
  },
};

/** バリデータ定義カタログ（全10件） */
function buildDefaultRegistry(): ValidatorRegistry {
  const defaultRule = ValidationRule.create({
    ruleName: 'default-rule',
    errorTemplate: { code: 'L2-001', severity: 'error', messageTemplate: '{{message}}' },
    fixExample: null,
  });

  const createDef = (id: string, layer: 'L2' | 'L3' | 'L4', enabledCondition: 'always' | 'strictOnly' = 'always', externalPolicyRef: string | null = null) =>
    ValidatorDefinition.create({
      validatorId: ValidatorId.create(id),
      layer,
      rules: [ValidationRule.create({
        ruleName: `${id}-rule`,
        errorTemplate: { code: id, severity: 'error', messageTemplate: '{{message}}' },
        fixExample: null,
      })],
      enabledCondition,
      externalPolicyRef,
    });

  const definitions = [
    createDef('L2-001', 'L2', 'always', 'PhaseGatePolicyPort'),
    createDef('L2-002', 'L2', 'always', 'MetadataPolicyPort'),
    createDef('L2-003', 'L2', 'always'),
    createDef('L3-001', 'L3', 'always'),
    createDef('L3-002', 'L3', 'strictOnly'),
    createDef('L3-003', 'L3', 'always'),
    createDef('L3-004', 'L3', 'always', 'AcCoveragePolicyPort'),
    createDef('L4-001', 'L4', 'always'),
    createDef('L4-002', 'L4', 'always'),
    createDef('L4-003', 'L4', 'strictOnly'),
  ];

  return new ValidatorRegistry(definitions);
}

export interface ValidatorSystemModule {
  registry: ValidatorRegistry;
  runL2ValidatorsUseCase: RunL2ValidatorsUseCase;
  runL3ValidatorsUseCase: RunL3ValidatorsUseCase;
  runL4ValidatorsUseCase: RunL4ValidatorsUseCase;
  runQuickModeUseCase: RunQuickModeUseCase;
  aggregateValidationResultsUseCase: AggregateValidationResultsUseCase;
  runFullValidationUseCase: RunFullValidationUseCase;
  handlers: {
    runValidators: RunValidatorsHandler;
    runQuickMode: RunQuickModeHandler;
    reportValidationResults: ReportValidationResultsHandler;
  };
}

export function createValidatorSystemModule(config?: object): ValidatorSystemModule {
  const configData = (config ?? DEFAULT_CONFIG) as typeof DEFAULT_CONFIG;
  const configPort = new HarnessConfigValidatorConfigAdapter(configData);
  const registry = buildDefaultRegistry();
  const executionService = new ValidatorExecutionService({ configPort });
  const contractMapper = new ValidationResultContractMapper();

  const runL2ValidatorsUseCase = new RunL2ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
  });

  const runL3ValidatorsUseCase = new RunL3ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
  });

  const runL4ValidatorsUseCase = new RunL4ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
  });

  const runQuickModeUseCase = new RunQuickModeUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
  });

  const aggregateValidationResultsUseCase = new AggregateValidationResultsUseCase();

  const runFullValidationUseCase = new RunFullValidationUseCase({
    runL2ValidatorsUseCase,
    runL3ValidatorsUseCase,
    runL4ValidatorsUseCase,
    aggregateValidationResultsUseCase,
  });

  const handlers = {
    runValidators: new RunValidatorsHandler({ runFullValidationUseCase }),
    runQuickMode: new RunQuickModeHandler({ runQuickModeUseCase }),
    reportValidationResults: new ReportValidationResultsHandler(),
  };

  return {
    registry,
    runL2ValidatorsUseCase,
    runL3ValidatorsUseCase,
    runL4ValidatorsUseCase,
    runQuickModeUseCase,
    aggregateValidationResultsUseCase,
    runFullValidationUseCase,
    handlers,
  };
}
