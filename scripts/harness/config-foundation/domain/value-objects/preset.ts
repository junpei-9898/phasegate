/**
 * @layer domain
 * @unit config-foundation
 *
 * Preset値オブジェクト - minimal / standard / strict のいずれかを表す
 */
import { InvalidPresetError } from '../errors/invalid-preset-error.js';

const ALLOWED_VALUES = ['minimal', 'standard', 'strict'] as const;
type PresetValue = (typeof ALLOWED_VALUES)[number];

export class Preset {
  readonly value: PresetValue;

  constructor(raw: string) {
    if (!ALLOWED_VALUES.includes(raw as PresetValue)) {
      throw new InvalidPresetError(raw);
    }
    this.value = raw as PresetValue;
    Object.freeze(this);
  }

  static create(raw: string): Preset {
    return new Preset(raw);
  }

  isMinimal(): boolean {
    return this.value === 'minimal';
  }

  isStandard(): boolean {
    return this.value === 'standard';
  }

  isStrict(): boolean {
    return this.value === 'strict';
  }

  equals(other: Preset): boolean {
    return this.value === other.value;
  }
}
