/**
 * @layer public-api
 * @unit phase-dependency-model
 *
 * phase-dependency-model ユニットのバレルエクスポート。
 */

// Composition Root
export { createPhaseDependencyModelModule } from './composition-root.js';
export type { PhaseDependencyModelConfig } from './composition-root.js';

// Presentation — CLI handlers
export { CheckPhaseGateCommandHandler } from './presentation/cli/check-phase-gate-command-handler.js';
