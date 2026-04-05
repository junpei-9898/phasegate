/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { CustomRule } from './custom-rule.js';

export type PresetName = 'full' | 'standard' | 'minimal' | 'custom';

export interface PhaseCustomizationPolicyCreateArgs {
  readonly preset?: PresetName | 'default';
  readonly rules: readonly CustomRule[];
  readonly overrideEnabled: boolean;
}

export class PhaseCustomizationPolicy {
  readonly preset: PresetName;
  readonly rules: readonly CustomRule[];
  readonly overrideEnabled: boolean;

  private constructor(args: {
    readonly preset: PresetName;
    readonly rules: readonly CustomRule[];
    readonly overrideEnabled: boolean;
  }) {
    this.preset = args.preset;
    this.rules = Object.freeze([...args.rules]);
    this.overrideEnabled = args.overrideEnabled;
    Object.freeze(this);
  }

  private static resolvePreset(preset: PresetName | 'default' | undefined, hasRules: boolean): PresetName {
    if (preset === undefined) {
      return hasRules ? 'custom' : 'full';
    }
    if (preset === 'default') {
      return 'full';
    }
    return preset;
  }

  static create(args: PhaseCustomizationPolicyCreateArgs): PhaseCustomizationPolicy {
    return new PhaseCustomizationPolicy({
      preset: PhaseCustomizationPolicy.resolvePreset(args.preset, args.rules.length > 0),
      rules: args.rules,
      overrideEnabled: args.overrideEnabled,
    });
  }

  hasRules(): boolean {
    return this.rules.length > 0;
  }

  requestsOverride(): boolean {
    return this.overrideEnabled;
  }

  equals(other: PhaseCustomizationPolicy): boolean {
    if (
      this.preset !== other.preset ||
      this.overrideEnabled !== other.overrideEnabled ||
      this.rules.length !== other.rules.length
    ) {
      return false;
    }

    return this.rules.every((rule, index) => rule.equals(other.rules[index]));
  }
}
