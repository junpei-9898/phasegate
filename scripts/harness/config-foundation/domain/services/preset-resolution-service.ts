/**
 * @layer domain
 * @unit config-foundation
 * @work-item-id WI-212
 * @work-item-id WI-300
 * @work-item-id WI-320
 */
import { ConfigFoundationDomainError } from "../errors/config-foundation-domain-error.js";
import type { HarnessConfigResolvedDocument, HarnessConfigSourceDocument } from "../harness-config.js";
import type { FeatureToggle } from "../value-objects/feature-toggle.js";
import { HarnessesConfig } from "../value-objects/harnesses-config.js";
import { WORLD_CONFIG_DEFAULTS, WorldConfig, type WorldConfigDocument } from "../value-objects/world-config.js";

export interface PresetDefinition {
  layers: HarnessConfigResolvedDocument["layers"];
  quickMode: HarnessConfigResolvedDocument["quickMode"];
  phaseDependencies: HarnessConfigResolvedDocument["phaseDependencies"];
  planningMode: HarnessConfigResolvedDocument["planningMode"];
  harnesses: HarnessConfigResolvedDocument["harnesses"];
  paths: HarnessConfigResolvedDocument["paths"];
  reporting: HarnessConfigResolvedDocument["reporting"];
  validate: HarnessConfigResolvedDocument["validate"];
  preCommit?: HarnessConfigResolvedDocument["preCommit"];
  world?: WorldConfigDocument;
}

export class InvalidPresetDefinitionError extends ConfigFoundationDomainError {
  constructor(message: string) {
    super(`${message} [L1-007]`, "L1-007");
    this.name = "InvalidPresetDefinitionError";
  }
}

export class ConfigMergeError extends ConfigFoundationDomainError {
  constructor(message: string) {
    super(`${message} [L1-008]`, "L1-008");
    this.name = "ConfigMergeError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, deepClone(entryValue)])) as T;
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
    const keys = new Set([...Object.keys(baseValue), ...Object.keys(overrideValue)]);

    for (const key of keys) {
      const nestedBaseValue = (baseValue as Record<string, unknown>)[key];
      const nestedOverrideValue = overrideValue[key];

      if (nestedBaseValue === undefined) {
        merged[key] = deepClone(nestedOverrideValue);
        continue;
      }

      merged[key] = deepMerge(nestedBaseValue, nestedOverrideValue, `${path}.${key}`);
    }

    return merged as T;
  }

  if (Array.isArray(overrideValue) || isPlainObject(overrideValue)) {
    throw new ConfigMergeError(`${path} のprimitiveを別構造で上書きできません`);
  }

  return deepClone(overrideValue as T);
}

function assertValidPresetDefinition(presetDefinition: PresetDefinition): void {
  const requiredKeys: Array<keyof PresetDefinition> = [
    "layers",
    "quickMode",
    "phaseDependencies",
    "planningMode",
    "harnesses",
    "paths",
    "reporting",
    "validate",
  ];

  for (const key of requiredKeys) {
    if (!(key in presetDefinition) || (presetDefinition as unknown as Record<string, unknown>)[key] === undefined) {
      throw new InvalidPresetDefinitionError(`presetDefinition.${key} は必須です`);
    }
  }
}

function toHarnessesDocument(harnesses: HarnessesConfig): HarnessConfigResolvedDocument["harnesses"] {
  return {
    agentLessonCollection: harnesses.agentLessonCollection,
    cascadeUpdate: harnesses.cascadeUpdate,
    bundleSizeLimit: harnesses.bundleSizeLimit,
    deadCodeGC: harnesses.deadCodeGC,
  };
}

export class PresetResolutionService {
  resolve(
    sourceDocument: HarnessConfigSourceDocument,
    presetDefinition: PresetDefinition,
  ): HarnessConfigResolvedDocument {
    assertValidPresetDefinition(presetDefinition);

    const layers = deepMerge(presetDefinition.layers, sourceDocument.layers, "layers");
    const paths = deepMerge(presetDefinition.paths, sourceDocument.paths, "paths");
    const world = deepMerge(presetDefinition.world ?? WORLD_CONFIG_DEFAULTS, sourceDocument.world, "world");
    const explicitCorpus = sourceDocument.world?.corpus;
    const explicitInputs = sourceDocument.world?.inputs;
    const derivedProductRoot = paths.designDocs.endsWith("/construction")
      ? paths.designDocs.slice(0, -"/construction".length)
      : paths.designDocs;
    const resolvedWorld: WorldConfigDocument = {
      ...world,
      corpus: {
        ...world.corpus,
        productRoots:
          explicitCorpus?.productRoots === undefined && !world.corpus.productRoots.includes(derivedProductRoot)
            ? [...world.corpus.productRoots, derivedProductRoot]
            : world.corpus.productRoots,
        inceptionRoots:
          explicitCorpus?.inceptionRoots === undefined ? [paths.inceptionDocs] : world.corpus.inceptionRoots,
      },
      inputs: {
        ...world.inputs,
        matrixPath:
          explicitInputs?.matrixPath === undefined
            ? (layers.L3.requirementMatrixPath ?? world.inputs.matrixPath)
            : world.inputs.matrixPath,
      },
    };

    return {
      project: {
        name: sourceDocument.project.name,
        preset: sourceDocument.project.preset,
        // WI-320 (github#39): 未宣言時に ["typescript"] を注入しない。「未宣言」を resolved config まで
        // 生存させ、validator-system adapter のファイルシステム言語検出（WI-319）を実 CLI 経路で有効にする。
        ...(sourceDocument.project.languages === undefined ? {} : { languages: sourceDocument.project.languages }),
      },
      layers,
      quickMode: deepMerge(presetDefinition.quickMode, sourceDocument.quickMode, "quickMode"),
      phaseDependencies: deepMerge(
        presetDefinition.phaseDependencies,
        sourceDocument.phaseDependencies,
        "phaseDependencies",
      ),
      planningMode: deepMerge(presetDefinition.planningMode, sourceDocument.planningMode, "planningMode"),
      harnesses: deepMerge(presetDefinition.harnesses, sourceDocument.harnesses, "harnesses"),
      paths,
      reporting: deepMerge(presetDefinition.reporting, sourceDocument.reporting, "reporting"),
      validate: deepMerge(presetDefinition.validate, sourceDocument.validate, "validate"),
      preCommit: deepMerge(
        presetDefinition.preCommit ?? { implementationExtensions: [".ts"] },
        sourceDocument.preCommit,
        "preCommit",
      ),
      world: WorldConfig.create(resolvedWorld).toDocument(),
    };
  }

  applyFeatureOverride(
    document: HarnessConfigResolvedDocument,
    override: FeatureToggle,
  ): HarnessConfigResolvedDocument {
    const harnesses = HarnessesConfig.create(document.harnesses);
    const nextHarnesses = override.enabled ? harnesses.enable(override.name) : harnesses.disable(override.name);

    return {
      ...deepClone(document),
      harnesses: toHarnessesDocument(nextHarnesses),
    };
  }
}
