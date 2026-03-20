/**
 * @layer public-api
 * @unit config-foundation
 *
 * config-foundation ユニットのバレルエクスポート。
 */

// Composition Root
export { createConfigFoundationModule } from './composition-root.js';

// Application — usecases
export { LoadResolvedConfigUseCase } from './application/usecases/load-resolved-config-use-case.js';

// Application — DTOs
export type { ResolvedConfigOutput } from './application/dto/resolved-config-output.js';
export type { FeatureToggleResult } from './application/dto/feature-toggle-result.js';
export type { AvailableFeatureItem } from './application/dto/available-feature-item.js';

// Presentation — CLI handlers
export { EnableFeatureCommandHandler } from './presentation/cli/enable-feature-command-handler.js';
export { DisableFeatureCommandHandler } from './presentation/cli/disable-feature-command-handler.js';

// Domain — ports
export type { ConfigRepositoryPort } from './domain/ports/config-repository-port.js';
export type { ConfigSchemaValidatorPort } from './domain/ports/config-schema-validator-port.js';
export type { FeatureRegistryPort } from './domain/ports/feature-registry-port.js';
