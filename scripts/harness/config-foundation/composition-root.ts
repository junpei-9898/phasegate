/**
 * @layer composition
 * @unit config-foundation
 *
 * config-foundation ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラー群を返す。
 */
import { FeatureRegistry } from './domain/services/feature-registry.js';
import { PresetResolutionService } from './domain/services/preset-resolution-service.js';
import { FileSystemConfigRepository } from './infrastructure/repositories/file-system-config-repository.js';
import { AjvConfigSchemaValidator } from './infrastructure/validators/ajv-config-schema-validator.js';
import { StaticFeatureRegistryAdapter } from './infrastructure/registries/static-feature-registry-adapter.js';
import { PresetDefinitionStore } from './infrastructure/preset-definition-store.js';
import { EnableFeatureUseCase } from './application/usecases/enable-feature-use-case.js';
import { DisableFeatureUseCase } from './application/usecases/disable-feature-use-case.js';
import { ListAvailableFeaturesUseCase } from './application/usecases/list-available-features-use-case.js';
import { LoadResolvedConfigUseCase } from './application/usecases/load-resolved-config-use-case.js';
import { EnableFeatureCommandHandler } from './presentation/cli/enable-feature-command-handler.js';
import { DisableFeatureCommandHandler } from './presentation/cli/disable-feature-command-handler.js';

export function createConfigFoundationModule() {
  // Infrastructure
  const configRepository = new FileSystemConfigRepository();
  const schemaValidator = new AjvConfigSchemaValidator();
  const featureRegistryPort = new StaticFeatureRegistryAdapter();
  const presetDefinitionStore = new PresetDefinitionStore();
  const presetDefinitions = presetDefinitionStore.load();

  // Domain services
  const featureRegistry = new FeatureRegistry();
  const presetResolutionService = new PresetResolutionService();

  // Shared dependencies for feature-related usecases
  const featureUseCaseDeps = {
    configRepository,
    schemaValidator,
    featureRegistryPort,
    presetDefinitions,
    presetResolutionService,
    featureRegistry,
  } as const;

  // Usecases
  const enableFeatureUseCase = new EnableFeatureUseCase(featureUseCaseDeps);
  const disableFeatureUseCase = new DisableFeatureUseCase(featureUseCaseDeps);
  const listAvailableFeaturesUseCase = new ListAvailableFeaturesUseCase(featureUseCaseDeps);
  const loadResolvedConfigUseCase = new LoadResolvedConfigUseCase({
    configRepository,
    schemaValidator,
    presetDefinitions,
    presetResolutionService,
  });

  // Presentation handlers
  const enableFeatureCommandHandler = new EnableFeatureCommandHandler({
    enableFeatureUseCase,
    listAvailableFeaturesUseCase,
  });
  const disableFeatureCommandHandler = new DisableFeatureCommandHandler({
    disableFeatureUseCase,
    listAvailableFeaturesUseCase,
  });

  return {
    handlers: {
      enableFeatureCommandHandler,
      disableFeatureCommandHandler,
    },
    usecases: {
      enableFeatureUseCase,
      disableFeatureUseCase,
      listAvailableFeaturesUseCase,
      loadResolvedConfigUseCase,
    },
  } as const;
}
