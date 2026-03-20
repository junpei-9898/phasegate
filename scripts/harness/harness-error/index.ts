/**
 * @layer barrel
 * @unit harness-error
 *
 * harness-error ユニットの公開バレルエクスポート
 */

// --- Composition Root ---
export { createHarnessErrorModule } from './composition-root.js';

// --- Key Types ---
export type { HarnessErrorContract } from './application/dto/harness-error-contract.js';

// --- Key Classes ---
export { ErrorDefinitionRegistry } from './domain/services/error-definition-registry.js';
export { HarnessErrorFactory } from './domain/services/harness-error-factory.js';
