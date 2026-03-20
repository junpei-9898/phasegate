// index.ts — harness-api public barrel export

// Composition Root
export { createHarnessApiModule } from './composition-root.js';
export type { HarnessApiModule, HarnessApiModuleOptions } from './composition-root.js';

// Domain Value Objects
export { CliCommandDefinition } from './domain/value-objects/cli-command-definition.js';
export { HarnessApiResponse } from './domain/value-objects/harness-api-response.js';
export { CheckReadyResult } from './domain/value-objects/check-ready-result.js';
export { CiCheckResult } from './domain/value-objects/ci-check-result.js';
export { DriftReportSummary } from './domain/value-objects/drift-report-summary.js';
export { HarnessStatusSummary } from './domain/value-objects/harness-status-summary.js';
export { ArtifactScanResult } from './domain/value-objects/artifact-scan-result.js';
export { LayerHealth } from './domain/value-objects/layer-health.js';
export { PhaseInfo } from './domain/value-objects/phase-info.js';
export { CommandInputSpec } from './domain/value-objects/command-input-spec.js';
export { ExitCodeSpec } from './domain/value-objects/exit-code-spec.js';

// Domain Services
export { CommandRegistry } from './domain/services/command-registry.js';
export { CommandDispatchService } from './domain/services/command-dispatch-service.js';
export { StatusDerivationService } from './domain/services/status-derivation-service.js';

// Application Use Cases
export { InitializeCommandRegistryUseCase } from './application/usecases/initialize-command-registry-usecase.js';
export { DispatchCommandUseCase } from './application/usecases/dispatch-command-usecase.js';
export { DecideExitCodeUseCase } from './application/usecases/decide-exit-code-usecase.js';
export { DeriveHarnessStatusUseCase } from './application/usecases/derive-harness-status-usecase.js';
