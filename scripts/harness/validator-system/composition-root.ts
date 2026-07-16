/**
 * @layer composition-root
 * @unit validator-system
 *
 * DI 組み立て — validator-system の全依存関係を構築する
 * @work-item-id WI-110 / WI-111 / WI-132 / WI-133 / WI-136 / WI-137 / WI-138 / WI-156
 * @work-item-id WI-217
 * @work-item-id WI-301
 */

import { join } from "node:path";
import { buildPhase2Extensions } from "../phase2-extensions/composition-root.js";
import { ValidationResultContractMapper } from "./application/mappers/validation-result-contract-mapper.js";
import { AggregateValidationResultsUseCase } from "./application/use-cases/aggregate-validation-results-usecase.js";
import { RunFullValidationUseCase } from "./application/use-cases/run-full-validation-usecase.js";
import { RunL1ValidatorsUseCase } from "./application/use-cases/run-l1-validators-usecase.js";
import { RunL2ValidatorsUseCase } from "./application/use-cases/run-l2-validators-usecase.js";
import { RunL3ValidatorsUseCase } from "./application/use-cases/run-l3-validators-usecase.js";
import { RunL4ValidatorsUseCase } from "./application/use-cases/run-l4-validators-usecase.js";
import { RunQuickModeUseCase } from "./application/use-cases/run-quick-mode-usecase.js";
import {
  ArchitectureSemanticAnalysisService,
  type ArchitectureSemanticPolicy,
} from "./domain/services/l4/architecture-semantic-analysis-service.js";
import { ConsistencyCheckService } from "./domain/services/l4/consistency-check-service.js";
import { DeadCodeDetectionService } from "./domain/services/l4/dead-code-detection-service.js";
import { DriftDetectionService } from "./domain/services/l4/drift-detection-service.js";
import { ValidatorExecutionService } from "./domain/services/validator-execution-service.js";
import { ValidatorRegistry } from "./domain/services/validator-registry.js";
import { ValidationRule } from "./domain/value-objects/validation-rule.js";
import { ValidatorDefinition } from "./domain/value-objects/validator-definition.js";
import { ValidatorId } from "./domain/value-objects/validator-id.js";
import { AdrFoundationReferenceAdapter } from "./infrastructure/adapters/adr-foundation-reference-adapter.js";
import { AstPerformanceScannerAdapter } from "./infrastructure/adapters/ast-performance-scanner-adapter.js";
import { BiomeAstSourceCodeAnalyzerAdapter } from "./infrastructure/adapters/biome-ast-source-code-analyzer-adapter.js";
import { BiomeAstTestQualityAnalyzerAdapter } from "./infrastructure/adapters/biome-ast-test-quality-analyzer-adapter.js";
import { CliCommandRegistryAdapter } from "./infrastructure/adapters/cli-command-registry-adapter.js";
import { E2eTestFileRegistryAdapter } from "./infrastructure/adapters/e2e-test-file-registry-adapter.js";
import { FileSystemArchitectureSemanticSourceAdapter } from "./infrastructure/adapters/file-system-architecture-semantic-source-adapter.js";
import { FileSystemContractTraceabilityPolicyAdapter } from "./infrastructure/adapters/file-system-contract-traceability-policy-adapter.js";
import { FileSystemCoverageAttestationGatingAdapter } from "./infrastructure/adapters/file-system-coverage-attestation-gating-adapter.js";
import { FileSystemCoverageAttestationVerificationAdapter } from "./infrastructure/adapters/file-system-coverage-attestation-verification-adapter.js";
import { FileSystemInjectionScanAdapter } from "./infrastructure/adapters/file-system-injection-scan-adapter.js";
import { FileSystemSecurityPatternScannerAdapter } from "./infrastructure/adapters/file-system-security-pattern-scanner-adapter.js";
import { FileSystemSkillCatalogDriftAdapter } from "./infrastructure/adapters/file-system-skill-catalog-drift-adapter.js";
import { FileSystemWorkItemReflectionAdapter } from "./infrastructure/adapters/file-system-work-item-reflection-adapter.js";
import { HarnessConfigValidatorConfigAdapter } from "./infrastructure/adapters/harness-config-validator-config-adapter.js";
import { ImportGraphSourceAnalysisAdapter } from "./infrastructure/adapters/import-graph-source-analysis-adapter.js";
import { ItTestFileAnalyzerAdapter } from "./infrastructure/adapters/it-test-file-analyzer-adapter.js";
import { JsonCoverageReportAdapter } from "./infrastructure/adapters/json-coverage-report-adapter.js";
import { MarkdownDesignDocumentAdapter } from "./infrastructure/adapters/markdown-design-document-adapter.js";
import { NyquistAcBoundCoveragePolicyAdapter } from "./infrastructure/adapters/nyquist-ac-bound-coverage-policy-adapter.js";
import { NyquistAcCoveragePolicyAdapter } from "./infrastructure/adapters/nyquist-ac-coverage-policy-adapter.js";
import { NyquistAcLevelTraceabilityAdapter } from "./infrastructure/adapters/nyquist-ac-level-traceability-adapter.js";
import { PhaseDependencyPhaseGatePolicyAdapter } from "./infrastructure/adapters/phase-dependency-phase-gate-policy-adapter.js";
import { SourceFileTextScannerAdapter } from "./infrastructure/adapters/source-file-text-scanner-adapter.js";
import { TraceabilityMetadataPolicyAdapter } from "./infrastructure/adapters/traceability-metadata-policy-adapter.js";
import { TraceabilityWorkItemStatusPolicyAdapter } from "./infrastructure/adapters/traceability-work-item-status-policy-adapter.js";
import { WorldModelConstraintAdmissionAdapter } from "./infrastructure/adapters/world-model-constraint-admission-adapter.js";
import { ReportValidationResultsHandler } from "./presentation/handlers/report-validation-results-handler.js";
import { RunQuickModeHandler } from "./presentation/handlers/run-quick-mode-handler.js";
import { RunValidatorsHandler } from "./presentation/handlers/run-validators-handler.js";

/** デフォルト設定（ハードコード fallback） */
const DEFAULT_CONFIG = {
  preset: "standard" as const,
  layers: {
    L2: { enabled: true, validators: ["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015", "L2-016"] },
    L3: {
      enabled: true,
      validators: ["L3-001", "L3-002", "L3-003", "L3-004", "L3-006", "L3-007"],
      coverageThreshold: 90,
      bundleSizeLimit: 512000,
      requirementMatrixPath: ".harness/requirement-test-matrix.json",
    },
    L4: { enabled: true, validators: ["L4-001", "L4-002", "L4-003", "L4-004", "L4-005", "L4-006"] },
  },
  paths: {
    designDocs: "docs/product/construction",
    inceptionDocs: "docs/inception",
  },
  validate: { failOnWarning: false },
  architecture: {
    capabilityPolicies: {
      domain: { allowed: [], denied: ["filesystem", "network", "database", "process-env", "subprocess", "user-io"] },
      application: { allowed: ["time", "random"], denied: ["filesystem", "network", "database", "subprocess"] },
      infrastructure: {
        allowed: ["filesystem", "network", "database", "process-env", "time", "random", "subprocess", "user-io"],
        denied: [],
      },
      presentation: { allowed: ["user-io", "time"], denied: ["database", "subprocess"] },
    },
    decisionPolicies: {
      domain: { expected: ["business-rule-branch", "validation-rule", "state-transition"], advisoryOnly: true },
      application: { expected: ["policy-selection", "error-construction"], advisoryOnly: true },
      infrastructure: { expected: ["error-construction"], advisoryOnly: true },
      presentation: { expected: ["validation-rule", "error-construction"], advisoryOnly: true },
    },
  },
};

/** バリデータ定義カタログ */
export function buildDefaultRegistry(): ValidatorRegistry {
  const createDef = (
    id: string,
    layer: "L2" | "L3" | "L4",
    enabledCondition: "always" | "strictOnly" = "always",
    externalPolicyRef: string | null = null,
  ) =>
    ValidatorDefinition.create({
      validatorId: ValidatorId.create(id),
      layer,
      rules: [
        ValidationRule.create({
          ruleName: `${id}-rule`,
          errorTemplate: { code: id, severity: "error", messageTemplate: "{{message}}" },
          fixExample: null,
        }),
      ],
      enabledCondition,
      externalPolicyRef,
    });

  const definitions = [
    createDef("L2-001", "L2", "always", "PhaseGatePolicyPort"),
    createDef("L2-002", "L2", "always", "MetadataPolicyPort"),
    createDef("L2-003", "L2", "always"),
    createDef("L2-013", "L2", "always", "CliE2eTestExistenceService"),
    createDef("L2-014", "L2", "always", "WorkItemStatusPolicyPort"),
    createDef("L2-015", "L2", "always", "ContractTraceabilityPolicyPort"),
    // WI-258 / ADR-030 §Decision.3.②: L2-016 (coverage-attestation-gating, fail-closed, default-ON)。
    createDef("L2-016", "L2", "always", "CoverageAttestationGatingPolicyPort"),
    createDef("L2-017", "L2", "always", "WorldConstraintAdmissionPolicyPort"),
    createDef("L3-001", "L3", "always"),
    createDef("L3-002", "L3", "strictOnly"),
    createDef("L3-003", "L3", "always"),
    createDef("L3-004", "L3", "always", "AcCoveragePolicyPort"),
    // WI-227 / H16-03: L3-005 (ac-bound-coverage) は registry には登録するが
    // default-OFF（DEFAULT_CONFIG.layers.L3.validators に含めない）。fail-closed / opt-in。
    createDef("L3-005", "L3", "always", "AcBoundCoveragePolicyPort"),
    // WI-259 / ADR-030 §Decision.3.④: L3-006 (injection-scan) は advisory (warning-only, default-ON)。
    createDef("L3-006", "L3", "always", "InjectionScanPolicyPort"),
    // WI-268 / ADR-030 §Decision.1・§Decision.3.② 第2段: L3-007 (coverage-attestation-verification)
    // は fail-closed / default-ON。L2-016 の authoritative 相棒。
    createDef("L3-007", "L3", "always", "CoverageAttestationVerificationPolicyPort"),
    createDef("L4-001", "L4", "always"),
    createDef("L4-002", "L4", "always"),
    createDef("L4-003", "L4", "strictOnly"),
    createDef("L4-004", "L4", "always"),
    createDef("L4-005", "L4", "always"),
    createDef("L4-006", "L4", "always", "SkillCatalogDriftPort"),
    // WI-222 / HF2-05: L4-007 (ac-level-traceability) は registry には登録するが
    // default-OFF（DEFAULT_CONFIG.layers.L4.validators に含めない）。advisory-only。
    createDef("L4-007", "L4", "always", "AcLevelTraceabilityPort"),
  ];

  return new ValidatorRegistry(definitions);
}

export interface ValidatorSystemModule {
  registry: ValidatorRegistry;
  runL1ValidatorsUseCase: RunL1ValidatorsUseCase;
  runL2ValidatorsUseCase: RunL2ValidatorsUseCase;
  runL3ValidatorsUseCase: RunL3ValidatorsUseCase;
  runL4ValidatorsUseCase: RunL4ValidatorsUseCase;
  runQuickModeUseCase: RunQuickModeUseCase;
  aggregateValidationResultsUseCase: AggregateValidationResultsUseCase;
  runFullValidationUseCase: RunFullValidationUseCase;
  driftDetectionService: DriftDetectionService;
  handlers: {
    runValidators: RunValidatorsHandler;
    runQuickMode: RunQuickModeHandler;
    reportValidationResults: ReportValidationResultsHandler;
  };
}

export function createValidatorSystemModule(config?: object): ValidatorSystemModule {
  const configData = (config ?? DEFAULT_CONFIG) as typeof DEFAULT_CONFIG;
  const configPort = new HarnessConfigValidatorConfigAdapter(configData);
  // WI-094 / ADR-017: validate.failOnWarning を handler に伝搬。config 未指定時は false
  const defaultFailOnWarning = configData.validate?.failOnWarning ?? false;
  const registry = buildDefaultRegistry();
  const executionService = new ValidatorExecutionService({ configPort });
  const contractMapper = new ValidationResultContractMapper();
  const phaseGatePolicyPort = new PhaseDependencyPhaseGatePolicyAdapter();
  const metadataPolicyPort = new TraceabilityMetadataPolicyAdapter();
  const acCoveragePolicyPort = new NyquistAcCoveragePolicyAdapter();
  // WI-227 / H16-03: L3-005 (ac-bound-coverage, fail-closed, default-OFF) 用の adapter。
  const acBoundCoveragePolicyPort = new NyquistAcBoundCoveragePolicyAdapter();
  // L3-003: テストカバレッジレポート（vitest --coverage の json-summary 出力）を読み取る。
  // 未配線だと L3-003 は装飾的な pass になり 90% 閾値が形骸化するため必ず配線する。
  const coverageReportPort = new JsonCoverageReportAdapter(join(process.cwd(), "coverage", "coverage-summary.json"));
  const testQualityAnalyzerPort = new BiomeAstTestQualityAnalyzerAdapter();
  const securityScannerPort = new FileSystemSecurityPatternScannerAdapter();
  const performanceScannerPort = new AstPerformanceScannerAdapter();
  const workItemStatusPolicyPort = new TraceabilityWorkItemStatusPolicyAdapter(process.cwd());
  const contractTraceabilityPolicyPort = new FileSystemContractTraceabilityPolicyAdapter();
  // WI-258 / ADR-030 §Decision.3.②: L2-016 (coverage-attestation-gating) 用アダプタ。
  // docs/product/construction/*​/coverage_report.md を cwd 起点で走査する（targetPaths 非依存）。
  const coverageAttestationGatingPolicyPort = new FileSystemCoverageAttestationGatingAdapter(process.cwd());
  const worldConstraintAdmissionPolicyPort = new WorldModelConstraintAdmissionAdapter({
    rootDir: process.cwd(),
    resolvedConfig: (configData as { world?: import("../world-model/index.js").WorldResolvedConfigInput }).world,
  });
  // WI-259 / ADR-030 §Decision.3.④: L3-006 (injection-scan, advisory) 用アダプタ。
  // 指示搭載ファイル群（skills/**​/SKILL.md / CLAUDE.md / AGENTS.md / agent-context / .claude/settings.json）を
  // cwd 起点で走査する（targetPaths 非依存）。
  const injectionScanPolicyPort = new FileSystemInjectionScanAdapter(process.cwd());
  // WI-268 / ADR-030 §Decision.1・§Decision.3.② 第2段: L3-007 (coverage-attestation-verification) 用アダプタ。
  // coverage_report の @attestation 参照を requirement-test-matrix に突合する（fail-closed）。
  const coverageAttestationVerificationPolicyPort = new FileSystemCoverageAttestationVerificationAdapter(
    process.cwd(),
    (configData.layers?.L3 as { requirementMatrixPath?: string } | undefined)?.requirementMatrixPath ??
      ".harness/requirement-test-matrix.json",
  );

  const cwd = process.cwd();
  const designDocsRoot = configData.paths?.designDocs ?? "docs/product/construction";
  const inceptionDocsRoot = configData.paths?.inceptionDocs ?? "docs/inception";
  const docsRoot = join(cwd, designDocsRoot);
  const e2eTestFileRegistryPort = new E2eTestFileRegistryAdapter({
    e2eTestRoot: join(cwd, "scripts/harness/__tests__/e2e"),
  });
  const cliCommandRegistryPort = new CliCommandRegistryAdapter({
    commands: [
      "validate",
      "lint",
      "ci-check",
      "phasegate:check-ready",
      "phasegate:check-phase",
      "phasegate:ci-check",
      "phasegate:detect-drift",
      "phasegate:lint",
      "phasegate:complete-check",
      "phasegate:impact-analysis",
      "phasegate:status",
    ],
  });

  const runL2ValidatorsUseCase = new RunL2ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
    phaseGatePolicyPort,
    metadataPolicyPort,
    testQualityAnalyzerPort,
    e2eTestFileRegistryPort,
    cliCommandRegistryPort,
    workItemStatusPolicyPort,
    contractTraceabilityPolicyPort,
    coverageAttestationGatingPolicyPort,
    worldConstraintAdmissionPolicyPort,
  });

  // WI-227 / H16-03: L3-005 のスコープ対象 story-id を config から取得（既定 []）。
  const acBoundStories =
    (configData.layers?.L3 as { acBoundStories?: readonly string[] } | undefined)?.acBoundStories ?? [];

  const runL3ValidatorsUseCase = new RunL3ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
    acCoveragePolicyPort,
    acBoundCoveragePolicyPort,
    coverageReportPort,
    securityScannerPort,
    performanceScannerPort,
    injectionScanPolicyPort,
    coverageAttestationVerificationPolicyPort,
    acBoundStories,
  });

  const markdownDesignDocumentPort = new MarkdownDesignDocumentAdapter(docsRoot);
  const sourceCodeAnalyzerAdapter = new BiomeAstSourceCodeAnalyzerAdapter();
  const adrReferencePort = new AdrFoundationReferenceAdapter(cwd);
  const sourceAnalysisPort = new ImportGraphSourceAnalysisAdapter();
  const architectureSemanticSourcePort = new FileSystemArchitectureSemanticSourceAdapter();
  const skillCatalogDriftPort = new FileSystemSkillCatalogDriftAdapter(cwd);
  // WI-222 / HF2-05: L4-007 (advisory) 用の AC 単位トレーサビリティ port。
  // matrix path は L3-004 と同じ config キーを参照する。
  const acLevelTraceabilityPort = new NyquistAcLevelTraceabilityAdapter({
    matrixFilePath: configData.layers?.L3?.requirementMatrixPath ?? ".harness/requirement-test-matrix.json",
  });
  const workItemReflectionPort = new FileSystemWorkItemReflectionAdapter(cwd);

  const driftDetectionService = new DriftDetectionService({
    designDocumentPort: markdownDesignDocumentPort,
    sourceCodeAnalyzerPort: sourceCodeAnalyzerAdapter,
  });
  const consistencyCheckService = new ConsistencyCheckService({
    designDocumentPort: markdownDesignDocumentPort,
    adrReferencePort,
    workItemReflectionPort,
  });
  const deadCodeDetectionService = new DeadCodeDetectionService({
    sourceAnalysisPort,
  });
  const architectureSemanticAnalysisService = new ArchitectureSemanticAnalysisService({
    sourcePort: architectureSemanticSourcePort,
    policy: toArchitectureSemanticPolicy(configData),
  });
  const phase2Extensions = buildPhase2Extensions(process.cwd(), configData as never);

  const runL4ValidatorsUseCase = new RunL4ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
    driftDetectionService,
    consistencyCheckService,
    deadCodeDetectionService,
    architectureSemanticAnalysisService,
    skillCatalogDriftPort,
    acLevelTraceabilityPort,
    pathRoots: {
      inceptionRoot: inceptionDocsRoot,
      designRoot: designDocsRoot,
    },
    checkDocFreshnessUseCase: phase2Extensions.checkDocFreshnessUseCase,
    validateDocPointersUseCase: phase2Extensions.validateDocPointersUseCase,
  });

  const runQuickModeUseCase = new RunQuickModeUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper,
  });

  const aggregateValidationResultsUseCase = new AggregateValidationResultsUseCase();
  const itTestFileAnalyzerPort = new ItTestFileAnalyzerAdapter({
    itTestRoot: join(cwd, "scripts/harness/__tests__/integration"),
    // アダプター自体のテストファイルは vi.mock() を使用しているため誤検知防止で除外
    excludePattern: /it-test-file-analyzer-adapter\.test\.ts$/,
  });
  const sourceFileTextScannerPort = new SourceFileTextScannerAdapter({ sourceRoot: join(cwd, "scripts/harness") });
  const runL1ValidatorsUseCase = new RunL1ValidatorsUseCase({
    itTestFileAnalyzerPort,
    sourceFileTextScannerPort,
    contractMapper,
  });

  const runFullValidationUseCase = new RunFullValidationUseCase({
    runL2ValidatorsUseCase,
    runL3ValidatorsUseCase,
    runL4ValidatorsUseCase,
    aggregateValidationResultsUseCase,
  });

  const handlers = {
    runValidators: new RunValidatorsHandler({
      runFullValidationUseCase,
      runL1ValidatorsUseCase,
      defaultFailOnWarning,
    }),
    runQuickMode: new RunQuickModeHandler({ runQuickModeUseCase }),
    reportValidationResults: new ReportValidationResultsHandler(),
  };

  return {
    registry,
    runL1ValidatorsUseCase,
    runL2ValidatorsUseCase,
    runL3ValidatorsUseCase,
    runL4ValidatorsUseCase,
    runQuickModeUseCase,
    aggregateValidationResultsUseCase,
    runFullValidationUseCase,
    driftDetectionService,
    handlers,
  };
}

function toArchitectureSemanticPolicy(configData: typeof DEFAULT_CONFIG): ArchitectureSemanticPolicy {
  const architecture = configData.architecture;
  return {
    capabilityPolicies: architecture?.capabilityPolicies ?? DEFAULT_CONFIG.architecture.capabilityPolicies,
    decisionPolicies: architecture?.decisionPolicies ?? DEFAULT_CONFIG.architecture.decisionPolicies,
  } as ArchitectureSemanticPolicy;
}
