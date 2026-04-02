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
import { RunL0ValidatorsUseCase } from './application/use-cases/run-l0-validators-usecase.js';
import { RunL2ValidatorsUseCase } from './application/use-cases/run-l2-validators-usecase.js';
import { RunL3ValidatorsUseCase } from './application/use-cases/run-l3-validators-usecase.js';
import { RunL4ValidatorsUseCase } from './application/use-cases/run-l4-validators-usecase.js';
import { RunL1ValidatorsUseCase } from './application/use-cases/run-l1-validators-usecase.js';
import { RunQuickModeUseCase } from './application/use-cases/run-quick-mode-usecase.js';
import { AggregateValidationResultsUseCase } from './application/use-cases/aggregate-validation-results-usecase.js';
import { RunFullValidationUseCase } from './application/use-cases/run-full-validation-usecase.js';
import { HarnessConfigValidatorConfigAdapter } from './infrastructure/adapters/harness-config-validator-config-adapter.js';
import { ItTestFileAnalyzerAdapter } from './infrastructure/adapters/it-test-file-analyzer-adapter.js';
import { SourceFileTextScannerAdapter } from './infrastructure/adapters/source-file-text-scanner-adapter.js';
import { E2eTestFileRegistryAdapter } from './infrastructure/adapters/e2e-test-file-registry-adapter.js';
import { CliCommandRegistryAdapter } from './infrastructure/adapters/cli-command-registry-adapter.js';
import { PhaseDependencyPhaseGatePolicyAdapter } from './infrastructure/adapters/phase-dependency-phase-gate-policy-adapter.js';
import { TraceabilityMetadataPolicyAdapter } from './infrastructure/adapters/traceability-metadata-policy-adapter.js';
import { NyquistAcCoveragePolicyAdapter } from './infrastructure/adapters/nyquist-ac-coverage-policy-adapter.js';
import { BiomeAstTestQualityAnalyzerAdapter } from './infrastructure/adapters/biome-ast-test-quality-analyzer-adapter.js';
import { FileSystemSecurityPatternScannerAdapter } from './infrastructure/adapters/file-system-security-pattern-scanner-adapter.js';
import { AstPerformanceScannerAdapter } from './infrastructure/adapters/ast-performance-scanner-adapter.js';
import { MarkdownDesignDocumentAdapter } from './infrastructure/adapters/markdown-design-document-adapter.js';
import { BiomeAstSourceCodeAnalyzerAdapter } from './infrastructure/adapters/biome-ast-source-code-analyzer-adapter.js';
import { AdrFoundationReferenceAdapter } from './infrastructure/adapters/adr-foundation-reference-adapter.js';
import { ImportGraphSourceAnalysisAdapter } from './infrastructure/adapters/import-graph-source-analysis-adapter.js';
import { DriftDetectionService } from './domain/services/l4/drift-detection-service.js';
import { ConsistencyCheckService } from './domain/services/l4/consistency-check-service.js';
import { DeadCodeDetectionService } from './domain/services/l4/dead-code-detection-service.js';
import { RunValidatorsHandler } from './presentation/handlers/run-validators-handler.js';
import { RunQuickModeHandler } from './presentation/handlers/run-quick-mode-handler.js';
import { ReportValidationResultsHandler } from './presentation/handlers/report-validation-results-handler.js';
import { join } from 'node:path';

/** デフォルト設定（ハードコード fallback） */
const DEFAULT_CONFIG = {
  preset: 'standard' as const,
  layers: {
    L0: { enabled: true, validators: ['L0-001', 'L0-002'] },
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

  const createDef = (id: string, layer: 'L0' | 'L2' | 'L3' | 'L4', enabledCondition: 'always' | 'strictOnly' = 'always', externalPolicyRef: string | null = null) =>
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
    createDef('L0-001', 'L0', 'always'),
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
  runL0ValidatorsUseCase: RunL0ValidatorsUseCase;
  runL1ValidatorsUseCase: RunL1ValidatorsUseCase;
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
  const phaseGatePolicyPort = new PhaseDependencyPhaseGatePolicyAdapter();
  const metadataPolicyPort = new TraceabilityMetadataPolicyAdapter();
  const acCoveragePolicyPort = new NyquistAcCoveragePolicyAdapter();
  const testQualityAnalyzerPort = new BiomeAstTestQualityAnalyzerAdapter();
  const securityScannerPort = new FileSystemSecurityPatternScannerAdapter();
  const performanceScannerPort = new AstPerformanceScannerAdapter();

  const runL0ValidatorsUseCase = new RunL0ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
  });

  const runL2ValidatorsUseCase = new RunL2ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
    phaseGatePolicyPort,
    metadataPolicyPort,
    testQualityAnalyzerPort,
  });

  const runL3ValidatorsUseCase = new RunL3ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
    acCoveragePolicyPort,
    securityScannerPort,
    performanceScannerPort,
  });

  const docsRoot = join(process.cwd(), 'docs/product/construction');
  const markdownDesignDocumentPort = new MarkdownDesignDocumentAdapter(docsRoot);
  const sourceCodeAnalyzerAdapter = new BiomeAstSourceCodeAnalyzerAdapter();
  const adrReferencePort = new AdrFoundationReferenceAdapter();
  const sourceAnalysisPort = new ImportGraphSourceAnalysisAdapter();

  const driftDetectionService = new DriftDetectionService({
    designDocumentPort: markdownDesignDocumentPort,
    sourceCodeAnalyzerPort: sourceCodeAnalyzerAdapter,
  });
  const consistencyCheckService = new ConsistencyCheckService({
    designDocumentPort: markdownDesignDocumentPort,
    adrReferencePort,
  });
  const deadCodeDetectionService = new DeadCodeDetectionService({
    sourceAnalysisPort,
  });

  const runL4ValidatorsUseCase = new RunL4ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
    driftDetectionService,
    consistencyCheckService,
    deadCodeDetectionService,
  });

  const runQuickModeUseCase = new RunQuickModeUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
  });

  const aggregateValidationResultsUseCase = new AggregateValidationResultsUseCase();
  const KNOWN_CLI_COMMANDS = [
    'validate', 'lint', 'ci-check', 'detect-drift',
    'harness:check-ready', 'harness:check-phase', 'harness:ci-check',
    'harness:detect-drift', 'harness:lint', 'harness:complete-check',
    'harness:impact-analysis', 'harness:status',
  ];
  const cwd = process.cwd();
  const itTestFileAnalyzerPort = new ItTestFileAnalyzerAdapter({
    itTestRoot: join(cwd, 'scripts/harness/__tests__/integration'),
    // アダプター自体のテストファイルは vi.mock() を使用しているため誤検知防止で除外
    excludePattern: /it-test-file-analyzer-adapter\.test\.ts$/,
  });
  const sourceFileTextScannerPort = new SourceFileTextScannerAdapter({ sourceRoot: join(cwd, 'scripts/harness') });
  const e2eTestFileRegistryPort = new E2eTestFileRegistryAdapter({ e2eTestRoot: join(cwd, 'scripts/harness/__tests__/e2e') });
  const cliCommandRegistryPort = new CliCommandRegistryAdapter({ commands: KNOWN_CLI_COMMANDS });
  const runL1ValidatorsUseCase = new RunL1ValidatorsUseCase({
    itTestFileAnalyzerPort,
    sourceFileTextScannerPort,
    e2eTestFileRegistryPort,
    cliCommandRegistryPort,
    contractMapper,
  });

  const runFullValidationUseCase = new RunFullValidationUseCase({
    runL2ValidatorsUseCase,
    runL3ValidatorsUseCase,
    runL4ValidatorsUseCase,
    aggregateValidationResultsUseCase,
  });

  const handlers = {
    runValidators: new RunValidatorsHandler({ runFullValidationUseCase, runL0ValidatorsUseCase, runL1ValidatorsUseCase }),
    runQuickMode: new RunQuickModeHandler({ runQuickModeUseCase }),
    reportValidationResults: new ReportValidationResultsHandler(),
  };

  return {
    registry,
    runL0ValidatorsUseCase,
    runL1ValidatorsUseCase,
    runL2ValidatorsUseCase,
    runL3ValidatorsUseCase,
    runL4ValidatorsUseCase,
    runQuickModeUseCase,
    aggregateValidationResultsUseCase,
    runFullValidationUseCase,
    handlers,
  };
}
