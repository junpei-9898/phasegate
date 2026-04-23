/**
 * @layer domain
 * @unit config-foundation
 */

import { ConfigValidationError } from '../errors/config-validation-error.js';
import {
  freezeArchitectureDocument,
  type ArchitectureConfigDocument,
  type ArchitectureConfigSource,
  type ArchitectureLayerDetection,
  type ArchitectureMetadataTags,
  type ArchitecturePresetId,
} from '../value-objects/architecture-config.js';
import {
  ARCHITECTURE_PRESET_CATALOG,
  type ArchitecturePresetDefinition,
} from '../value-objects/architecture-preset-catalog.js';

const DEFAULT_METADATA_TAGS: ArchitectureMetadataTags = Object.freeze({
  layer: '@layer',
  unit: '@unit',
});

const DEFAULT_LAYER_DETECTION: ArchitectureLayerDetection = Object.freeze({
  byPath: true,
  byTag: true,
});

const CLEAN_DEFAULT_SOURCE: ArchitectureConfigSource = Object.freeze({
  preset: 'clean',
});

export interface ArchitectureResolutionResult {
  readonly document: ArchitectureConfigDocument;
  readonly warnings: readonly string[];
}

const cloneDependencies = (
  source: Readonly<Record<string, readonly string[]>>
): Record<string, string[]> => {
  const cloned: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(source)) {
    cloned[key] = [...value];
  }

  return cloned;
};

const lookupPresetDefinition = (
  preset: ArchitecturePresetId
): ArchitecturePresetDefinition | null => {
  if (preset === 'custom') {
    return null;
  }

  return ARCHITECTURE_PRESET_CATALOG[preset];
};

const ensureCustomHasExplicitLayers = (source: ArchitectureConfigSource): void => {
  if (source.preset !== 'custom') {
    return;
  }

  if (source.layers === undefined || source.allowedDependencies === undefined) {
    throw new ConfigValidationError(
      'architecture.preset "custom" では layers と allowedDependencies の明示指定が必須です'
    );
  }
};

const mergeLayers = (
  preset: ArchitecturePresetDefinition | null,
  override: readonly string[] | undefined
): string[] => {
  if (override !== undefined) {
    return [...override];
  }

  return preset !== null ? [...preset.layers] : [];
};

const mergeDependencies = (
  preset: ArchitecturePresetDefinition | null,
  override: Readonly<Record<string, readonly string[]>> | undefined
): Record<string, string[]> => {
  if (override !== undefined) {
    return cloneDependencies(override);
  }

  return preset !== null ? cloneDependencies(preset.allowedDependencies) : {};
};

const mergeMetadataTags = (
  override: Partial<ArchitectureMetadataTags> | undefined
): ArchitectureMetadataTags => {
  return {
    layer: override?.layer ?? DEFAULT_METADATA_TAGS.layer,
    unit: override?.unit ?? DEFAULT_METADATA_TAGS.unit,
  };
};

const mergeLayerDetection = (
  override: Partial<ArchitectureLayerDetection> | undefined
): ArchitectureLayerDetection => {
  return {
    byPath: override?.byPath ?? DEFAULT_LAYER_DETECTION.byPath,
    byTag: override?.byTag ?? DEFAULT_LAYER_DETECTION.byTag,
  };
};

const validateLayerDetection = (detection: ArchitectureLayerDetection): void => {
  if (!detection.byPath && !detection.byTag) {
    throw new ConfigValidationError(
      'architecture.layerDetection は byPath / byTag の少なくとも一方を true にする必要があります'
    );
  }
};

const validateDependencyKeys = (
  layers: readonly string[],
  allowedDependencies: Record<string, string[]>
): void => {
  for (const key of Object.keys(allowedDependencies)) {
    if (!layers.includes(key)) {
      throw new ConfigValidationError(
        `architecture.allowedDependencies のキー "${key}" は layers 配列に含まれません (C2)`
      );
    }
  }
};

const validateDependencyValues = (
  layers: readonly string[],
  allowedDependencies: Record<string, string[]>
): void => {
  for (const [key, targets] of Object.entries(allowedDependencies)) {
    for (const target of targets) {
      if (!layers.includes(target)) {
        throw new ConfigValidationError(
          `architecture.allowedDependencies["${key}"] の依存先 "${target}" は layers 配列に含まれません (C3)`
        );
      }
    }
  }
};

const autofillSelfReference = (
  layers: readonly string[],
  allowedDependencies: Record<string, string[]>,
  warnings: string[]
): void => {
  for (const layer of layers) {
    const targets = allowedDependencies[layer];

    if (targets === undefined) {
      continue;
    }

    if (!targets.includes(layer)) {
      targets.unshift(layer);
      warnings.push(
        `architecture.allowedDependencies["${layer}"] に自己参照 "${layer}" を補完しました (C1)`
      );
    }
  }
};

const autofillMissingLayers = (
  layers: readonly string[],
  allowedDependencies: Record<string, string[]>,
  warnings: string[]
): void => {
  for (const layer of layers) {
    if (!(layer in allowedDependencies)) {
      allowedDependencies[layer] = [layer];
      warnings.push(
        `architecture.allowedDependencies に layer "${layer}" のエントリが無いため自己参照のみで補完しました (C4)`
      );
    }
  }
};

const warnCircularDependencies = (
  allowedDependencies: Record<string, string[]>,
  warnings: string[]
): void => {
  const entries = Object.entries(allowedDependencies);

  for (const [source, targets] of entries) {
    for (const target of targets) {
      if (target === source) {
        continue;
      }

      const reverseTargets = allowedDependencies[target];

      if (reverseTargets !== undefined && reverseTargets.includes(source)) {
        warnings.push(
          `architecture.allowedDependencies に循環依存の疑いがあります: "${source}" → "${target}" と "${target}" → "${source}" (C5)`
        );
      }
    }
  }
};

const freezeDependencies = (
  dependencies: Record<string, string[]>
): Record<string, readonly string[]> => {
  const frozen: Record<string, readonly string[]> = {};

  for (const [key, value] of Object.entries(dependencies)) {
    frozen[key] = Object.freeze([...value]);
  }

  return frozen;
};

export class ArchitectureResolutionService {
  resolve(source: ArchitectureConfigSource | undefined): ArchitectureResolutionResult {
    const warnings: string[] = [];
    const effectiveSource = source ?? CLEAN_DEFAULT_SOURCE;

    ensureCustomHasExplicitLayers(effectiveSource);

    const presetDefinition = lookupPresetDefinition(effectiveSource.preset);
    const layers = mergeLayers(presetDefinition, effectiveSource.layers);
    const allowedDependencies = mergeDependencies(
      presetDefinition,
      effectiveSource.allowedDependencies
    );

    validateDependencyKeys(layers, allowedDependencies);
    validateDependencyValues(layers, allowedDependencies);
    autofillMissingLayers(layers, allowedDependencies, warnings);
    autofillSelfReference(layers, allowedDependencies, warnings);
    warnCircularDependencies(allowedDependencies, warnings);

    const layerDetection = mergeLayerDetection(effectiveSource.layerDetection);

    validateLayerDetection(layerDetection);

    const document: ArchitectureConfigDocument = freezeArchitectureDocument({
      preset: effectiveSource.preset,
      layers,
      allowedDependencies: freezeDependencies(allowedDependencies),
      metadataTags: mergeMetadataTags(effectiveSource.metadataTags),
      layerDetection,
    });

    return Object.freeze({
      document,
      warnings: Object.freeze([...warnings]),
    });
  }
}
