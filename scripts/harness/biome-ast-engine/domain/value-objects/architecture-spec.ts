/**
 * @layer domain
 * @unit biome-ast-engine
 */

export type ArchitectureSpec = {
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags: ArchitectureMetadataTags;
};

export type ArchitectureMetadataTags = {
  readonly unit: string;
  readonly layer: string;
};

export type ArchitectureSpecInput = {
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags?: Partial<ArchitectureMetadataTags>;
};

export const DEFAULT_METADATA_TAGS: ArchitectureMetadataTags = Object.freeze({
  unit: '@unit',
  layer: '@layer',
});

const freezeDependencyMap = (
  map: Record<string, readonly string[]>
): Readonly<Record<string, readonly string[]>> => {
  const frozen: Record<string, readonly string[]> = {};

  for (const [key, value] of Object.entries(map)) {
    frozen[key] = Object.freeze([...value]);
  }

  return Object.freeze(frozen);
};

export const freezeArchitectureSpec = (spec: ArchitectureSpecInput): ArchitectureSpec => {
  return Object.freeze({
    layers: Object.freeze([...spec.layers]),
    allowedDependencies: freezeDependencyMap({ ...spec.allowedDependencies }),
    metadataTags: Object.freeze({
      ...DEFAULT_METADATA_TAGS,
      ...spec.metadataTags,
    }),
  });
};

export const CLEAN_PRESET_SPEC: ArchitectureSpec = freezeArchitectureSpec({
  layers: ['domain', 'application', 'infrastructure', 'presentation'],
  allowedDependencies: {
    domain: ['domain'],
    application: ['application', 'domain'],
    infrastructure: ['infrastructure', 'application', 'domain'],
    presentation: ['presentation', 'application', 'domain'],
  },
});
