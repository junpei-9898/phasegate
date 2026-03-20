/**
 * @layer application
 * @unit config-foundation
 */
import type { ConfigRepositoryPort } from '../../domain/ports/config-repository-port.js';
import type { ConfigSchemaValidatorPort } from '../../domain/ports/config-schema-validator-port.js';
import type { FeatureRegistryPort } from '../../domain/ports/feature-registry-port.js';
import { FeatureRegistry } from '../../domain/services/feature-registry.js';
import { PresetResolutionService } from '../../domain/services/preset-resolution-service.js';
import type { AvailableFeatureItem } from '../dto/available-feature-item.js';
import {
  loadHarnessConfig,
  type PresetDefinitions,
} from './load-resolved-config-use-case.js';

export interface ListAvailableFeaturesUseCaseDependencies {
  readonly configRepository: ConfigRepositoryPort;
  readonly schemaValidator: ConfigSchemaValidatorPort;
  readonly featureRegistryPort: FeatureRegistryPort;
  readonly presetDefinitions: PresetDefinitions;
  readonly presetResolutionService: PresetResolutionService;
  readonly featureRegistry: FeatureRegistry;
}

export class ListAvailableFeaturesUseCase {
  private readonly configRepository: ConfigRepositoryPort;
  private readonly schemaValidator: ConfigSchemaValidatorPort;
  private readonly featureRegistryPort: FeatureRegistryPort;
  private readonly presetDefinitions: PresetDefinitions;
  private readonly presetResolutionService: PresetResolutionService;
  private readonly featureRegistry: FeatureRegistry;

  constructor(dependencies: ListAvailableFeaturesUseCaseDependencies) {
    this.configRepository = dependencies.configRepository;
    this.schemaValidator = dependencies.schemaValidator;
    this.featureRegistryPort = dependencies.featureRegistryPort;
    this.presetDefinitions = dependencies.presetDefinitions;
    this.presetResolutionService = dependencies.presetResolutionService;
    this.featureRegistry = dependencies.featureRegistry;
  }

  async execute(configPath?: string): Promise<readonly AvailableFeatureItem[]> {
    const { aggregate } = await loadHarnessConfig(
      {
        configRepository: this.configRepository,
        schemaValidator: this.schemaValidator,
        presetDefinitions: this.presetDefinitions,
        presetResolutionService: this.presetResolutionService,
      },
      configPath,
    );
    const availableFeatures = this.featureRegistry.listAvailable(
      this.featureRegistryPort,
    );

    return availableFeatures.map((featureName) => ({
      name: featureName.toString(),
      enabled: aggregate.isFeatureEnabled(featureName),
    }));
  }
}
