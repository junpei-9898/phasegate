/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { CustomRule } from './custom-rule.js';

export interface PhaseCustomizationPolicyCreateArgs {
  readonly preset?: 'default' | 'custom';
  readonly rules: readonly CustomRule[];
  readonly overrideEnabled: boolean;
}

export class PhaseCustomizationPolicy {
  readonly preset: 'default' | 'custom';
  readonly rules: readonly CustomRule[];
  readonly overrideEnabled: boolean;

  private constructor(args: {
    readonly preset: 'default' | 'custom';
    readonly rules: readonly CustomRule[];
    readonly overrideEnabled: boolean;
  }) {
    this.preset = args.preset;
    this.rules = Object.freeze([...args.rules]);
    this.overrideEnabled = args.overrideEnabled;
    Object.freeze(this);
  }

  static create(args: PhaseCustomizationPolicyCreateArgs): PhaseCustomizationPolicy {
    return new PhaseCustomizationPolicy({
      preset: args.preset ?? (args.rules.length === 0 ? 'default' : 'custom'),
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
