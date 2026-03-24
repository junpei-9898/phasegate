/**
 * @layer composition
 * @unit phase-dependency-model
 *
 * phase-dependency-model ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラー群を返す。
 */
import { FileSystemArtifactExistenceChecker } from './infrastructure/filesystem/file-system-artifact-existence-checker.js';
import { MarkdownPlanDocumentReader } from './infrastructure/filesystem/markdown-plan-document-reader.js';
import {
  HarnessConfigPhaseConfigProvider,
  type PhaseConfigSection,
} from './infrastructure/config/harness-config-phase-config-provider.js';
import { PhaseOverrideAuditLogger } from './infrastructure/logging/phase-override-audit-logger.js';
import { EvidenceBundleAssembler } from './application/services/evidence-bundle-assembler.js';
import { CheckPhaseGateUseCase } from './application/usecases/check-phase-gate-usecase.js';
import { CheckPhaseGateCommandHandler } from './presentation/cli/check-phase-gate-command-handler.js';

const DEFAULT_REPORT_OUTPUT_DIR = '.harness/reports';

const defaultPhaseConfig: PhaseConfigSection = {
  planningMode: 'interactive' as const,
  customization: { preset: 'default' as const },
  reportingOutputDir: DEFAULT_REPORT_OUTPUT_DIR,
};

export interface PhaseDependencyModelConfig {
  readonly rootDir: string;
  readonly phaseConfig?: unknown; // PhaseConfigSection from resolved config
  readonly reportOutputDir?: string;
}

export function createPhaseDependencyModelModule(
  config: PhaseDependencyModelConfig,
) {
  const phaseConfig = (config.phaseConfig as PhaseConfigSection | undefined) ?? defaultPhaseConfig;
  const reportOutputDir = config.reportOutputDir ?? DEFAULT_REPORT_OUTPUT_DIR;

  // Infrastructure
  const artifactExistenceChecker = new FileSystemArtifactExistenceChecker({
    rootDir: config.rootDir,
  });
  const planDocumentReader = new MarkdownPlanDocumentReader({
    rootDir: config.rootDir,
  });
  const phaseConfigProvider = new HarnessConfigPhaseConfigProvider({
    config: phaseConfig,
    defaultOutputDir: reportOutputDir,
  });
  const auditLogger = new PhaseOverrideAuditLogger({
    outputDir: reportOutputDir,
  });

  // Application services
  const evidenceBundleAssembler = new EvidenceBundleAssembler({
    artifactExistenceChecker,
    planDocumentReader,
    phaseConfigProvider,
  });

  // Usecases
  const checkPhaseGateUseCase = new CheckPhaseGateUseCase({
    phaseConfigProvider,
    evidenceBundleAssembler,
    auditLogger,
  });

  // Presentation handlers
  const checkPhaseGateCommandHandler = new CheckPhaseGateCommandHandler({
    checkPhaseGateUseCase,
  });

  return {
    checkPhaseGateCommandHandler,
  } as const;
}
