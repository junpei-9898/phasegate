// composition-root.ts — harness-api Composition Root

import { CommandRegistry } from './domain/services/command-registry.js';
import { StatusDerivationService } from './domain/services/status-derivation-service.js';
import { InitializeCommandRegistryUseCase } from './application/usecases/initialize-command-registry-usecase.js';
import { DispatchCommandUseCase } from './application/usecases/dispatch-command-usecase.js';
import { DecideExitCodeUseCase } from './application/usecases/decide-exit-code-usecase.js';
import { DeriveHarnessStatusUseCase } from './application/usecases/derive-harness-status-usecase.js';
import { ValidatorSystemExecutionAdapter } from './infrastructure/adapters/validator-system-execution-adapter.js';
import { PhaseDependencyModelQueryAdapter } from './infrastructure/adapters/phase-dependency-model-query-adapter.js';
import { BiomeAstEngineLintAdapter } from './infrastructure/adapters/biome-ast-engine-lint-adapter.js';
import { NyquistValidationImpactAnalysisAdapter } from './infrastructure/adapters/nyquist-validation-impact-analysis-adapter.js';
import { FileSystemArtifactScannerAdapter } from './infrastructure/adapters/file-system-artifact-scanner-adapter.js';
import { HarnessConfigQueryAdapter } from './infrastructure/adapters/harness-config-query-adapter.js';
import { CheckReadyHandler } from './presentation/handlers/check-ready-handler.js';
import { CheckPhaseHandler } from './presentation/handlers/check-phase-handler.js';
import { CiCheckHandler } from './presentation/handlers/ci-check-handler.js';
import { DetectDriftHandler } from './presentation/handlers/detect-drift-handler.js';
import { StatusHandler } from './presentation/handlers/status-handler.js';
import { LintHandler } from './presentation/handlers/lint-handler.js';
import { CompleteCheckHandler } from './presentation/handlers/complete-check-handler.js';
import { ImpactAnalysisHandler } from './presentation/handlers/impact-analysis-handler.js';

export interface HarnessApiModuleOptions {
  configPath?: string;
}

export interface HarnessApiModule {
  handlers: {
    checkReady: CheckReadyHandler;
    checkPhase: CheckPhaseHandler;
    ciCheck: CiCheckHandler;
    detectDrift: DetectDriftHandler;
    status: StatusHandler;
    lint: LintHandler;
    completeCheck: CompleteCheckHandler;
    impactAnalysis: ImpactAnalysisHandler;
  };
  useCases: {
    initializeRegistry: InitializeCommandRegistryUseCase;
    dispatch: DispatchCommandUseCase;
    decideExitCode: DecideExitCodeUseCase;
    deriveStatus: DeriveHarnessStatusUseCase;
  };
}

export function createHarnessApiModule(options: HarnessApiModuleOptions = {}): HarnessApiModule {
  const configPath = options.configPath ?? 'harness.config.json';

  // Infrastructure adapters
  const validatorExecutionPort = new ValidatorSystemExecutionAdapter();
  const phaseGateQueryPort = new PhaseDependencyModelQueryAdapter();
  const biomeLintPort = new BiomeAstEngineLintAdapter();
  const impactAnalysisPort = new NyquistValidationImpactAnalysisAdapter();
  const artifactScannerPort = new FileSystemArtifactScannerAdapter({ configPath });
  const configQueryPort = new HarnessConfigQueryAdapter({ configPath });

  // Domain services
  const commandRegistry = new CommandRegistry();
  const statusDerivationService = new StatusDerivationService();

  // Application use cases
  const initializeRegistry = new InitializeCommandRegistryUseCase({ registry: commandRegistry });
  const dispatch = new DispatchCommandUseCase({
    validatorExecutionPort,
    phaseGateQueryPort,
    biomeLintPort,
    impactAnalysisPort,
    artifactScannerPort,
    configQueryPort,
    statusDerivationService,
  });
  const decideExitCode = new DecideExitCodeUseCase();
  const deriveStatus = new DeriveHarnessStatusUseCase({
    artifactScannerPort,
    configQueryPort,
    statusDerivationService,
  });

  // Presentation handlers
  const handlers = {
    checkReady: new CheckReadyHandler(dispatch),
    checkPhase: new CheckPhaseHandler(dispatch),
    ciCheck: new CiCheckHandler(dispatch),
    detectDrift: new DetectDriftHandler(dispatch),
    status: new StatusHandler(dispatch),
    lint: new LintHandler(dispatch),
    completeCheck: new CompleteCheckHandler(dispatch),
    impactAnalysis: new ImpactAnalysisHandler(dispatch),
  };

  return {
    handlers,
    useCases: { initializeRegistry, dispatch, decideExitCode, deriveStatus },
  };
}
