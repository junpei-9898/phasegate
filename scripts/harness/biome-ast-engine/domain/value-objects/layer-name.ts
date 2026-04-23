/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { CLEAN_PRESET_SPEC, type ArchitectureSpec } from './architecture-spec.js';

export type LayerNameValue = string;

export class InvalidLayerNameError extends Error {
  constructor(value: string) {
    super(`Invalid LayerName: ${value}`);
    this.name = 'InvalidLayerNameError';
  }
}

export class LayerName {
  readonly value: LayerNameValue;
  private readonly spec: ArchitectureSpec;

  private constructor(value: LayerNameValue, spec: ArchitectureSpec) {
    this.value = value;
    this.spec = spec;
  }

  static fromString(value: string, spec: ArchitectureSpec = CLEAN_PRESET_SPEC): LayerName {
    if (!spec.layers.includes(value)) {
      throw new InvalidLayerNameError(value);
    }

    return Object.freeze(new LayerName(value, spec));
  }

  static tryFromString(value: string, spec: ArchitectureSpec = CLEAN_PRESET_SPEC): LayerName | null {
    if (!spec.layers.includes(value)) {
      return null;
    }

    return Object.freeze(new LayerName(value, spec));
  }

  equals(other: LayerName): boolean {
    return this.value === other.value;
  }

  canDependOn(target: LayerName): boolean {
    const allowed = this.spec.allowedDependencies[this.value] ?? [];

    return allowed.includes(target.value);
  }

  toPathSegment(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
