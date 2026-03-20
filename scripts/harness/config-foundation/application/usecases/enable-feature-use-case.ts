/**
 * @layer application
 * @unit config-foundation
 */
import type { ConfigRepositoryPort } from '../../domain/ports/config-repository-port.js';
import type { ConfigSchemaValidatorPort } from '../../domain/ports/config-schema-validator-port.js';
import type { FeatureRegistryPort } from '../../domain/ports/feature-registry-port.js';
import { FeatureRegistry } from '../../domain/services/feature-registry.js';
import { PresetResolutionService } from '../../domain/services/preset-resolution-service.js';
import type { FeatureToggleResult } from '../dto/feature-toggle-result.js';
import {
  loadHarnessConfig,
  type PresetDefinitions,
  validateDocumentOrThrow,
} from './load-resolved-config-use-case.js';

export interface EnableFeatureUseCaseDependencies {
  readonly configRepository: ConfigRepositoryPort;
  readonly schemaValidator: ConfigSchemaValidatorPort;
  readonly featureRegistryPort: FeatureRegistryPort;
  readonly presetDefinitions: PresetDefinitions;
  readonly presetResolutionService: PresetResolutionService;
  readonly featureRegistry: FeatureRegistry;
}

export class EnableFeatureUseCase {
  private readonly configRepository: ConfigRepositoryPort;
  private readonly schemaValidator: ConfigSchemaValidatorPort;
  private readonly featureRegistryPort: FeatureRegistryPort;
  private readonly presetDefinitions: PresetDefinitions;
  private readonly presetResolutionService: PresetResolutionService;
  private readonly featureRegistry: FeatureRegistry;

  constructor(dependencies: EnableFeatureUseCaseDependencies) {
    this.configRepository = dependencies.configRepository;
    this.schemaValidator = dependencies.schemaValidator;
    this.featureRegistryPort = dependencies.featureRegistryPort;
    this.presetDefinitions = dependencies.presetDefinitions;
    this.presetResolutionService = dependencies.presetResolutionService;
    this.featureRegistry = dependencies.featureRegistry;
  }

  async execute(featureName: string, configPath?: string): Promise<FeatureToggleResult> {
    const { aggregate, path } = await loadHarnessConfig(
      {
        configRepository: this.configRepository,
        schemaValidator: this.schemaValidator,
        presetDefinitions: this.presetDefinitions,
        presetResolutionService: this.presetResolutionService,
      },
      configPath,
    );
    const featureNameVo = this.featureRegistry.ensureAvailable(
      featureName,
      this.featureRegistryPort,
    );

    aggregate.enableFeature(featureNameVo);

    const sourceDocument = aggregate.toSourceDocument();

    validateDocumentOrThrow(this.schemaValidator, sourceDocument);
    await this.configRepository.save(path, sourceDocument);

    return {
      feature: featureNameVo.toString(),
      enabled: true,
      configPath: path,
    };
  }
}
