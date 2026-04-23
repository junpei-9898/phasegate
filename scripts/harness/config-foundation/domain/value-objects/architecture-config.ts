/**
 * @layer domain
 * @unit config-foundation
 */

export const ARCHITECTURE_PRESET_IDS = [
  'clean',
  'strict-ddd',
  'onion',
  'hexagonal',
  'layered',
  'flat',
  'custom',
] as const;

export type ArchitecturePresetId = (typeof ARCHITECTURE_PRESET_IDS)[number];

export interface ArchitectureMetadataTags {
  readonly layer: string;
  readonly unit: string;
}

export interface ArchitectureLayerDetection {
  readonly byPath: boolean;
  readonly byTag: boolean;
}

export interface ArchitectureConfigSource {
  readonly preset: ArchitecturePresetId;
  readonly layers?: readonly string[];
  readonly allowedDependencies?: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags?: Partial<ArchitectureMetadataTags>;
  readonly layerDetection?: Partial<ArchitectureLayerDetection>;
}

export interface ArchitectureConfigDocument {
  readonly preset: ArchitecturePresetId;
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags: ArchitectureMetadataTags;
  readonly layerDetection: ArchitectureLayerDetection;
}

export const isArchitecturePresetId = (value: unknown): value is ArchitecturePresetId => {
  return (
    typeof value === 'string' && ARCHITECTURE_PRESET_IDS.includes(value as ArchitecturePresetId)
  );
};

export const freezeArchitectureDocument = (
  document: ArchitectureConfigDocument
): ArchitectureConfigDocument => {
  const frozenDependencies: Record<string, readonly string[]> = {};

  for (const [key, value] of Object.entries(document.allowedDependencies)) {
    frozenDependencies[key] = Object.freeze([...value]);
  }

  return Object.freeze({
    preset: document.preset,
    layers: Object.freeze([...document.layers]),
    allowedDependencies: Object.freeze(frozenDependencies),
    metadataTags: Object.freeze({ ...document.metadataTags }),
    layerDetection: Object.freeze({ ...document.layerDetection }),
  });
};
