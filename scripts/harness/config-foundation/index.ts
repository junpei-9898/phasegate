// @unit config-foundation
// @layer application
// @work-item-id WI-300

export type { AvailableFeatureItem } from "./application/dto/available-feature-item.js";
export type { FeatureToggleResult } from "./application/dto/feature-toggle-result.js";
export type { ResolvedConfigOutput } from "./application/dto/resolved-config-output.js";
export { toValidatorSystemConfig } from "./application/mappers/validator-system-config-mapper.js";
export { toWorldModelConfig } from "./application/mappers/world-model-config-mapper.js";
export { LoadResolvedConfigUseCase } from "./application/usecases/load-resolved-config-use-case.js";
export { createConfigFoundationModule } from "./composition-root.js";
export type { ConfigRepositoryPort } from "./domain/ports/config-repository-port.js";
export type { ConfigSchemaValidatorPort } from "./domain/ports/config-schema-validator-port.js";
export type { FeatureRegistryPort } from "./domain/ports/feature-registry-port.js";
export type { WorldConfigDocument } from "./domain/value-objects/world-config.js";
export { DisableFeatureCommandHandler } from "./presentation/cli/disable-feature-command-handler.js";
export { EnableFeatureCommandHandler } from "./presentation/cli/enable-feature-command-handler.js";
