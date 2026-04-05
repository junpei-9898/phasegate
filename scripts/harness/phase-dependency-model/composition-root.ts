/**
 * @layer composition
 * @unit phase-dependency-model
 *
 * phase-dependency-model ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラー群を返す。
 */
import { FileSystemArtifactExistenceChecker } from './infrastructure/filesystem/file-system-artifact-existence-checker.js';
import { MarkdownPlanDocumentReader } from './infrastructure/filesystem/markdown-plan-document-reader.js';
import { InMemoryGlobMatcher } from './infrastructure/adapters/in-memory-glob-matcher.js';
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
import { GateDefinition } from './domain/values/gate-definition.js';

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
  const auditLogger = new PhaseOverrideAuditLogger({
    outputDir: reportOutputDir,
  });
  const globMatcher = new InMemoryGlobMatcher();

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
  });
  const checkPhaseGateFacade = {
    execute: async (input: {
      readonly targetLevel: 1 | 2 | 3;
      readonly unitId?: string;
      readonly storyId?: string;
      readonly targetFilePath?: string;
    }) => {
      if (isCustomPreset && input.targetFilePath) {
        const gates = rawCustomGates.map((gate) => GateDefinition.fromRaw(gate));
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
