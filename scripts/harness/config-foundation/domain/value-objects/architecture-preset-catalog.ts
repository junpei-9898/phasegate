/**
 * @layer domain
 * @unit config-foundation
 */

import type { ArchitecturePresetId, CapabilityPolicy, DecisionPolicy } from './architecture-config.js';

export interface ArchitecturePresetDefinition {
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
  readonly capabilityPolicies: Readonly<Record<string, CapabilityPolicy>>;
  readonly decisionPolicies: Readonly<Record<string, DecisionPolicy>>;
}

const freeze = (definition: ArchitecturePresetDefinition): ArchitecturePresetDefinition => {
  const dependencies: Record<string, readonly string[]> = {};
  const capabilityPolicies: Record<string, CapabilityPolicy> = {};
  const decisionPolicies: Record<string, DecisionPolicy> = {};

  for (const [key, value] of Object.entries(definition.allowedDependencies)) {
    dependencies[key] = Object.freeze([...value]);
  }
  for (const [key, value] of Object.entries(definition.capabilityPolicies)) {
    capabilityPolicies[key] = Object.freeze({
      allowed: Object.freeze([...value.allowed]),
      denied: Object.freeze([...value.denied]),
    });
  }
  for (const [key, value] of Object.entries(definition.decisionPolicies)) {
    decisionPolicies[key] = Object.freeze({
      expected: Object.freeze([...value.expected]),
      advisoryOnly: value.advisoryOnly,
    });
  }

  return Object.freeze({
    layers: Object.freeze([...definition.layers]),
    allowedDependencies: Object.freeze(dependencies),
    capabilityPolicies: Object.freeze(capabilityPolicies),
    decisionPolicies: Object.freeze(decisionPolicies),
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
    capabilityPolicies: {
      domain: { allowed: [], denied: ['filesystem', 'network', 'database', 'process-env', 'subprocess', 'user-io'] },
      application: { allowed: ['time', 'random'], denied: ['filesystem', 'network', 'database', 'subprocess'] },
      infrastructure: { allowed: ['filesystem', 'network', 'database', 'process-env', 'time', 'random', 'subprocess', 'user-io'], denied: [] },
      presentation: { allowed: ['user-io', 'time'], denied: ['database', 'subprocess'] },
    },
    decisionPolicies: {
      domain: { expected: ['business-rule-branch', 'validation-rule', 'state-transition'], advisoryOnly: true },
      application: { expected: ['policy-selection', 'error-construction'], advisoryOnly: true },
      infrastructure: { expected: ['error-construction'], advisoryOnly: true },
      presentation: { expected: ['validation-rule', 'error-construction'], advisoryOnly: true },
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
    capabilityPolicies: {
      domain: { allowed: [], denied: ['filesystem', 'network', 'database', 'process-env', 'subprocess', 'user-io'] },
      application: { allowed: ['time'], denied: ['filesystem', 'network', 'database', 'random', 'subprocess'] },
      infrastructure: { allowed: ['filesystem', 'network', 'database', 'process-env', 'time', 'random', 'subprocess', 'user-io'], denied: [] },
      presentation: { allowed: ['user-io'], denied: ['database', 'subprocess'] },
    },
    decisionPolicies: {
      domain: { expected: ['business-rule-branch', 'validation-rule', 'state-transition'], advisoryOnly: true },
      application: { expected: ['policy-selection'], advisoryOnly: true },
      infrastructure: { expected: [], advisoryOnly: true },
      presentation: { expected: ['error-construction'], advisoryOnly: true },
    },
  }),
  onion: freeze({
    layers: ['domain', 'application', 'interface'],
    allowedDependencies: {
      domain: ['domain'],
      application: ['application', 'domain'],
      interface: ['interface', 'application', 'domain'],
    },
    capabilityPolicies: {
      domain: { allowed: [], denied: ['filesystem', 'network', 'database', 'process-env', 'subprocess', 'user-io'] },
      application: { allowed: ['time', 'random'], denied: ['filesystem', 'network', 'database', 'subprocess'] },
      interface: { allowed: ['filesystem', 'network', 'database', 'process-env', 'time', 'random', 'subprocess', 'user-io'], denied: [] },
    },
    decisionPolicies: {
      domain: { expected: ['business-rule-branch', 'validation-rule', 'state-transition'], advisoryOnly: true },
      application: { expected: ['policy-selection', 'error-construction'], advisoryOnly: true },
      interface: { expected: ['error-construction'], advisoryOnly: true },
    },
  }),
  hexagonal: freeze({
    layers: ['core', 'ports', 'adapters'],
    allowedDependencies: {
      core: ['core'],
      ports: ['ports', 'core'],
      adapters: ['adapters', 'ports', 'core'],
    },
    capabilityPolicies: {
      core: { allowed: [], denied: ['filesystem', 'network', 'database', 'process-env', 'subprocess', 'user-io'] },
      ports: { allowed: [], denied: ['filesystem', 'network', 'database', 'subprocess'] },
      adapters: { allowed: ['filesystem', 'network', 'database', 'process-env', 'time', 'random', 'subprocess', 'user-io'], denied: [] },
    },
    decisionPolicies: {
      core: { expected: ['business-rule-branch', 'validation-rule', 'state-transition'], advisoryOnly: true },
      ports: { expected: [], advisoryOnly: true },
      adapters: { expected: ['error-construction'], advisoryOnly: true },
    },
  }),
  layered: freeze({
    layers: ['controller', 'service', 'repository'],
    allowedDependencies: {
      controller: ['controller', 'service'],
      service: ['service', 'repository'],
      repository: ['repository'],
    },
    capabilityPolicies: {
      controller: { allowed: ['user-io'], denied: ['database', 'filesystem', 'subprocess'] },
      service: { allowed: ['time', 'random'], denied: ['filesystem', 'network', 'database', 'subprocess'] },
      repository: { allowed: ['database', 'filesystem', 'network', 'process-env'], denied: ['user-io'] },
    },
    decisionPolicies: {
      controller: { expected: ['validation-rule', 'error-construction'], advisoryOnly: true },
      service: { expected: ['business-rule-branch', 'policy-selection', 'state-transition'], advisoryOnly: true },
      repository: { expected: ['error-construction'], advisoryOnly: true },
    },
  }),
  flat: freeze({
    layers: [],
    allowedDependencies: {},
    capabilityPolicies: {},
    decisionPolicies: {},
  }),
});
