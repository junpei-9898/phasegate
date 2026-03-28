/**
 * @layer domain
 * @unit config-foundation
 */
import { ConfigFoundationDomainError } from '../errors/config-foundation-domain-error.js';
import type {
  HarnessConfigResolvedDocument,
  HarnessConfigSourceDocument,
} from '../harness-config.js';
import { HarnessesConfig } from '../value-objects/harnesses-config.js';
import type { FeatureToggle } from '../value-objects/feature-toggle.js';

export interface PresetDefinition {
  layers: HarnessConfigResolvedDocument['layers'];
  quickMode: HarnessConfigResolvedDocument['quickMode'];
  phaseDependencies: HarnessConfigResolvedDocument['phaseDependencies'];
  planningMode: HarnessConfigResolvedDocument['planningMode'];
  harnesses: HarnessConfigResolvedDocument['harnesses'];
  paths: HarnessConfigResolvedDocument['paths'];
  reporting: HarnessConfigResolvedDocument['reporting'];
}

export class InvalidPresetDefinitionError extends ConfigFoundationDomainError {
  constructor(message: string) {
    super(`${message} [L1-007]`, 'L1-007');
    this.name = 'InvalidPresetDefinitionError';
  }
}

export class ConfigMergeError extends ConfigFoundationDomainError {
  constructor(message: string) {
    super(`${message} [L1-008]`, 'L1-008');
    this.name = 'ConfigMergeError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, deepClone(entryValue)]),
    ) as T;
  }

  return value;
}

function deepMerge<T>(baseValue: T, overrideValue: unknown, path: string): T {
  if (overrideValue === undefined) {
    return deepClone(baseValue);
  }

  if (Array.isArray(baseValue)) {
    if (!Array.isArray(overrideValue)) {
      throw new ConfigMergeError(`${path} の配列を別型で上書きできません`);
    }

    return deepClone(overrideValue) as T;
  }

  if (isPlainObject(baseValue)) {
    if (!isPlainObject(overrideValue)) {
      throw new ConfigMergeError(`${path} のobjectを別型で上書きできません`);
    }

    const merged: Record<string, unknown> = {};
    const keys = new Set([
      ...Object.keys(baseValue),
      ...Object.keys(overrideValue),
    ]);

    for (const key of keys) {
      const nestedBaseValue = (baseValue as Record<string, unknown>)[key];
      const nestedOverrideValue = overrideValue[key];

      if (nestedBaseValue === undefined) {
        merged[key] = deepClone(nestedOverrideValue);
        continue;
      }

      merged[key] = deepMerge(
        nestedBaseValue,
        nestedOverrideValue,
        `${path}.${key}`,
      );
    }

    return merged as T;
  }

  if (Array.isArray(overrideValue) || isPlainObject(overrideValue)) {
    throw new ConfigMergeError(`${path} のprimitiveを別構造で上書きできません`);
  }

  return deepClone(overrideValue as T);
}

function assertValidPresetDefinition(
  presetDefinition: PresetDefinition,
): void {
  const requiredKeys: Array<keyof PresetDefinition> = [
    'layers',
    'quickMode',
    'phaseDependencies',
    'planningMode',
    'harnesses',
    'paths',
    'reporting',
  ];

  for (const key of requiredKeys) {
    if (
      !(key in presetDefinition) ||
      (presetDefinition as unknown as Record<string, unknown>)[key] === undefined
    ) {
      throw new InvalidPresetDefinitionError(
        `presetDefinition.${key} は必須です`,
      );
    }
  }
}

function toHarnessesDocument(
  harnesses: HarnessesConfig,
): HarnessConfigResolvedDocument['harnesses'] {
  return {
    agentLessonCollection: harnesses.agentLessonCollection,
    cascadeUpdate: harnesses.cascadeUpdate,
    bundleSizeLimit: harnesses.bundleSizeLimit,
    deadCodeGC: harnesses.deadCodeGC,
    guardMode: harnesses.guardMode,
  };
}

export class PresetResolutionService {
  resolve(
    sourceDocument: HarnessConfigSourceDocument,
    presetDefinition: PresetDefinition,
  ): HarnessConfigResolvedDocument {
    assertValidPresetDefinition(presetDefinition);

    return {
      project: {
        name: sourceDocument.project.name,
        preset: sourceDocument.project.preset,
      },
      layers: deepMerge(presetDefinition.layers, sourceDocument.layers, 'layers'),
      quickMode: deepMerge(
        presetDefinition.quickMode,
        sourceDocument.quickMode,
        'quickMode',
      ),
      phaseDependencies: deepMerge(
        presetDefinition.phaseDependencies,
        sourceDocument.phaseDependencies,
        'phaseDependencies',
      ),
      planningMode: deepMerge(
        presetDefinition.planningMode,
        sourceDocument.planningMode,
        'planningMode',
      ),
      harnesses: deepMerge(
        presetDefinition.harnesses,
        sourceDocument.harnesses,
        'harnesses',
      ),
      paths: deepMerge(presetDefinition.paths, sourceDocument.paths, 'paths'),
      reporting: deepMerge(
        presetDefinition.reporting,
        sourceDocument.reporting,
        'reporting',
      ),
    };
  }

  applyFeatureOverride(
    document: HarnessConfigResolvedDocument,
    override: FeatureToggle,
  ): HarnessConfigResolvedDocument {
    const harnesses = HarnessesConfig.create(document.harnesses);
    const nextHarnesses = override.enabled
      ? harnesses.enable(override.name)
      : harnesses.disable(override.name);

    return {
      ...deepClone(document),
      harnesses: toHarnessesDocument(nextHarnesses),
    };
  }
}
