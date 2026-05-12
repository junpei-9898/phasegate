/**
 * @layer domain
 * @unit biome-ast-engine
 */

export type ArchitectureSpec = {
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags: ArchitectureMetadataTags;
  readonly capabilityPolicies: Readonly<Record<string, ArchitectureCapabilityPolicy>>;
  readonly decisionPolicies: Readonly<Record<string, ArchitectureDecisionPolicy>>;
};

export type ArchitectureMetadataTags = {
  readonly unit: string;
  readonly layer: string;
};

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

export type ArchitectureCapabilityPolicy = {
  readonly allowed: readonly EffectCapability[];
  readonly denied: readonly EffectCapability[];
};

export type ArchitectureDecisionPolicy = {
  readonly expected: readonly DecisionSignal[];
  readonly advisoryOnly: boolean;
};

export type ArchitectureSpecInput = {
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags?: Partial<ArchitectureMetadataTags>;
  readonly capabilityPolicies?: Readonly<Record<string, ArchitectureCapabilityPolicy>>;
  readonly decisionPolicies?: Readonly<Record<string, ArchitectureDecisionPolicy>>;
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

const freezeCapabilityPolicies = (
  policies: Readonly<Record<string, ArchitectureCapabilityPolicy>> = {},
): Readonly<Record<string, ArchitectureCapabilityPolicy>> => {
  const frozen: Record<string, ArchitectureCapabilityPolicy> = {};
  for (const [zone, policy] of Object.entries(policies)) {
    frozen[zone] = Object.freeze({
      allowed: Object.freeze([...policy.allowed]),
      denied: Object.freeze([...policy.denied]),
    });
  }
  return Object.freeze(frozen);
};

const freezeDecisionPolicies = (
  policies: Readonly<Record<string, ArchitectureDecisionPolicy>> = {},
): Readonly<Record<string, ArchitectureDecisionPolicy>> => {
  const frozen: Record<string, ArchitectureDecisionPolicy> = {};
  for (const [zone, policy] of Object.entries(policies)) {
    frozen[zone] = Object.freeze({
      expected: Object.freeze([...policy.expected]),
      advisoryOnly: policy.advisoryOnly,
    });
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
    capabilityPolicies: freezeCapabilityPolicies(spec.capabilityPolicies),
    decisionPolicies: freezeDecisionPolicies(spec.decisionPolicies),
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
  capabilityPolicies: {
    domain: {
      allowed: [],
      denied: ['filesystem', 'network', 'database', 'process-env', 'subprocess', 'user-io'],
    },
    application: {
      allowed: ['time', 'random'],
      denied: ['filesystem', 'network', 'database', 'subprocess'],
    },
    infrastructure: {
      allowed: ['filesystem', 'network', 'database', 'process-env', 'time', 'random', 'subprocess', 'user-io'],
      denied: [],
    },
    presentation: {
      allowed: ['user-io', 'time'],
      denied: ['database', 'subprocess'],
    },
  },
  decisionPolicies: {
    domain: {
      expected: ['business-rule-branch', 'validation-rule', 'state-transition'],
      advisoryOnly: true,
    },
    application: {
      expected: ['policy-selection', 'error-construction'],
      advisoryOnly: true,
    },
    infrastructure: {
      expected: ['error-construction'],
      advisoryOnly: true,
    },
    presentation: {
      expected: ['validation-rule', 'error-construction'],
      advisoryOnly: true,
    },
  },
});
