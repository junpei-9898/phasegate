/**
 * @layer domain
 * @unit config-foundation
 */

import type { ArchitecturePresetId } from './architecture-config.js';

export interface ArchitecturePresetDefinition {
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
}

const freeze = (definition: ArchitecturePresetDefinition): ArchitecturePresetDefinition => {
  const dependencies: Record<string, readonly string[]> = {};

  for (const [key, value] of Object.entries(definition.allowedDependencies)) {
    dependencies[key] = Object.freeze([...value]);
  }

  return Object.freeze({
    layers: Object.freeze([...definition.layers]),
    allowedDependencies: Object.freeze(dependencies),
  });
};

export const ARCHITECTURE_PRESET_CATALOG: Readonly<
  Record<Exclude<ArchitecturePresetId, 'custom'>, ArchitecturePresetDefinition>
> = Object.freeze({
  clean: freeze({
    layers: ['domain', 'application', 'infrastructure', 'presentation'],
    allowedDependencies: {
      domain: ['domain'],
      application: ['application', 'domain'],
      infrastructure: ['infrastructure', 'application', 'domain'],
      presentation: ['presentation', 'application', 'domain'],
    },
  }),
  'strict-ddd': freeze({
    layers: ['domain', 'application', 'infrastructure', 'presentation'],
    allowedDependencies: {
      domain: ['domain'],
      application: ['application', 'domain'],
      infrastructure: ['infrastructure', 'application', 'domain'],
      presentation: ['presentation', 'application'],
    },
  }),
  onion: freeze({
    layers: ['domain', 'application', 'interface'],
    allowedDependencies: {
      domain: ['domain'],
      application: ['application', 'domain'],
      interface: ['interface', 'application', 'domain'],
    },
  }),
  hexagonal: freeze({
    layers: ['core', 'ports', 'adapters'],
    allowedDependencies: {
      core: ['core'],
      ports: ['ports', 'core'],
      adapters: ['adapters', 'ports', 'core'],
    },
  }),
  layered: freeze({
    layers: ['controller', 'service', 'repository'],
    allowedDependencies: {
      controller: ['controller', 'service'],
      service: ['service', 'repository'],
      repository: ['repository'],
    },
  }),
  flat: freeze({
    layers: [],
    allowedDependencies: {},
  }),
});
