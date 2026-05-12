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

export type EffectCapability =
  | 'filesystem'
  | 'network'
  | 'database'
  | 'process-env'
  | 'time'
  | 'random'
  | 'subprocess'
  | 'user-io';

export type DecisionSignal =
  | 'business-rule-branch'
  | 'validation-rule'
  | 'error-construction'
  | 'state-transition'
  | 'policy-selection';

export interface CapabilityPolicy {
  readonly allowed: readonly EffectCapability[];
  readonly denied: readonly EffectCapability[];
}

export interface DecisionPolicy {
  readonly expected: readonly DecisionSignal[];
  readonly advisoryOnly: boolean;
}

export interface ArchitectureConfigSource {
  readonly preset: ArchitecturePresetId;
  readonly layers?: readonly string[];
  readonly allowedDependencies?: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags?: Partial<ArchitectureMetadataTags>;
  readonly layerDetection?: Partial<ArchitectureLayerDetection>;
  readonly capabilityPolicies?: Readonly<Record<string, CapabilityPolicy>>;
  readonly decisionPolicies?: Readonly<Record<string, DecisionPolicy>>;
}

export interface ArchitectureConfigDocument {
  readonly preset: ArchitecturePresetId;
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags: ArchitectureMetadataTags;
  readonly layerDetection: ArchitectureLayerDetection;
  readonly capabilityPolicies: Readonly<Record<string, CapabilityPolicy>>;
  readonly decisionPolicies: Readonly<Record<string, DecisionPolicy>>;
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
  const frozenCapabilityPolicies: Record<string, CapabilityPolicy> = {};
  const frozenDecisionPolicies: Record<string, DecisionPolicy> = {};

  for (const [key, value] of Object.entries(document.allowedDependencies)) {
    frozenDependencies[key] = Object.freeze([...value]);
  }
  for (const [key, value] of Object.entries(document.capabilityPolicies)) {
    frozenCapabilityPolicies[key] = Object.freeze({
      allowed: Object.freeze([...value.allowed]),
      denied: Object.freeze([...value.denied]),
    });
  }
  for (const [key, value] of Object.entries(document.decisionPolicies)) {
    frozenDecisionPolicies[key] = Object.freeze({
      expected: Object.freeze([...value.expected]),
      advisoryOnly: value.advisoryOnly,
    });
  }

  return Object.freeze({
    preset: document.preset,
    layers: Object.freeze([...document.layers]),
    allowedDependencies: Object.freeze(frozenDependencies),
    metadataTags: Object.freeze({ ...document.metadataTags }),
    layerDetection: Object.freeze({ ...document.layerDetection }),
    capabilityPolicies: Object.freeze(frozenCapabilityPolicies),
    decisionPolicies: Object.freeze(frozenDecisionPolicies),
  });
};
