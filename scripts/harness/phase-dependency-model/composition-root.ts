/**
 * @layer composition
 * @unit phase-dependency-model
 *
 * phase-dependency-model ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラー群を返す。
 */
import { FileSystemArtifactExistenceChecker } from './infrastructure/filesystem/file-system-artifact-existence-checker.js';
import { MarkdownPlanDocumentReader } from './infrastructure/filesystem/markdown-plan-document-reader.js';
import { PicomatchGlobMatcher } from './infrastructure/adapters/picomatch-glob-matcher.js';
import { StoryAnnotationVerifierAdapter } from './infrastructure/adapters/story-annotation-verifier-adapter.js';
import { CustomGatesConfigParser } from './infrastructure/config/custom-gates-config-parser.js';
import { MarkdownDesignDocumentGateway } from '../traceability-model/infrastructure/gateways/markdown-design-document-gateway.js';
import {
  HarnessConfigPhaseConfigProvider,
  type PhaseConfigSection,
} from './infrastructure/config/harness-config-phase-config-provider.js';
import { PhaseOverrideAuditLogger } from './infrastructure/logging/phase-override-audit-logger.js';
import { EvidenceBundleAssembler } from './application/services/evidence-bundle-assembler.js';
import { PhaseGateResultMapper } from './application/services/phase-gate-result-mapper.js';
import { CheckPhaseGateUseCase } from './application/usecases/check-phase-gate-usecase.js';
import { ResolveGateUseCase } from './application/usecases/resolve-gate-usecase.js';
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
  const rawCustomGates =
    ((config.phaseConfig as {
      readonly gates?: readonly unknown[];
      readonly customization?: { readonly gates?: readonly unknown[]; readonly preset?: string };
    } | undefined)?.gates) ??
    ((config.phaseConfig as {
      readonly customization?: { readonly gates?: readonly unknown[]; readonly preset?: string };
    } | undefined)?.customization?.gates) ??
    [];
  const isCustomPreset = phaseConfig.customization?.preset === 'custom';

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
  const designDocumentGateway = new MarkdownDesignDocumentGateway({
    rootDir: config.rootDir,
  });
  const auditLogger = new PhaseOverrideAuditLogger({
    outputDir: reportOutputDir,
  });
  const globMatcher = new PicomatchGlobMatcher();
  const storyAnnotationVerifier = new StoryAnnotationVerifierAdapter({
    designDocumentGateway,
  });
  const customGatesConfigParser = new CustomGatesConfigParser();

  // Application services
  const evidenceBundleAssembler = new EvidenceBundleAssembler({
    artifactExistenceChecker,
    planDocumentReader,
    phaseConfigProvider,
  });
  const phaseGateResultMapper = new PhaseGateResultMapper();

  // Usecases
  const checkPhaseGateUseCase = new CheckPhaseGateUseCase({
    phaseConfigProvider,
    evidenceBundleAssembler,
    auditLogger,
  });
  const resolveGateUseCase = new ResolveGateUseCase({
    globMatcher,
    artifactExistenceChecker,
    storyAnnotationVerifier,
  });
  const checkPhaseGateFacade = {
    execute: async (input: {
      readonly targetLevel: 1 | 2 | 3;
      readonly unitId?: string;
      readonly storyId?: string;
      readonly targetFilePath?: string;
    }) => {
      if (isCustomPreset && input.targetFilePath) {
        const { gates } = customGatesConfigParser.parse(rawCustomGates);
        const resolved = await resolveGateUseCase.execute({
          targetFilePath: input.targetFilePath,
          gates,
          scope: { unitId: input.unitId, storyId: input.storyId },
        });
        return phaseGateResultMapper.mapFromResolve(resolved, {
          targetLevel: input.targetLevel,
        });
      }

      return checkPhaseGateUseCase.execute({
        targetLevel: input.targetLevel,
        unitId: input.unitId,
        storyId: input.storyId,
      });
    },
  };

  // Presentation handlers
  const checkPhaseGateCommandHandler = new CheckPhaseGateCommandHandler({
    checkPhaseGateUseCase: checkPhaseGateFacade,
  });

  return {
    checkPhaseGateCommandHandler,
  } as const;
}
