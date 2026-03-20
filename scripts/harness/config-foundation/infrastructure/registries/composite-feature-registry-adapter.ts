/**
 * @layer infrastructure
 * @unit config-foundation
 */
import type { FeatureRegistryPort } from '../../domain/ports/feature-registry-port.js';

export interface CompositeFeatureRegistryAdapterDependencies {
  readonly sources: readonly FeatureRegistryPort[];
}

export class CompositeFeatureRegistryAdapter implements FeatureRegistryPort {
  private readonly sources: readonly FeatureRegistryPort[];

  constructor(dependencies: CompositeFeatureRegistryAdapterDependencies) {
    this.sources = dependencies.sources;
  }

  listAvailable(): readonly string[] {
    const merged = this.sources.flatMap((source) => source.listAvailable());
    return [...new Set(merged)];
  }
}
