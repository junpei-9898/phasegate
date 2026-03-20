/**
 * @layer domain
 * @unit biome-ast-engine
 */

export type LayerNameValue = 'domain' | 'application' | 'infrastructure' | 'presentation';

const VALID_LAYER_NAMES = new Set<LayerNameValue>([
  'domain',
  'application',
  'infrastructure',
  'presentation',
]);

const ALLOWED_DEPENDENCIES: Readonly<Record<LayerNameValue, readonly LayerNameValue[]>> = {
  domain: Object.freeze(['domain']),
  application: Object.freeze(['application', 'domain']),
  infrastructure: Object.freeze(['infrastructure', 'application', 'domain']),
  presentation: Object.freeze(['presentation', 'application']),
};

export class InvalidLayerNameError extends Error {
  constructor(value: string) {
    super(`Invalid LayerName: ${value}`);
    this.name = 'InvalidLayerNameError';
  }
}

export class LayerName {
  readonly value: LayerNameValue;

  private constructor(value: LayerNameValue) {
    this.value = value;
  }

  static fromString(value: string): LayerName {
    if (!VALID_LAYER_NAMES.has(value as LayerNameValue)) {
      throw new InvalidLayerNameError(value);
    }

    return Object.freeze(new LayerName(value as LayerNameValue));
  }

  static tryFromString(value: string): LayerName | null {
    if (!VALID_LAYER_NAMES.has(value as LayerNameValue)) {
      return null;
    }

    return Object.freeze(new LayerName(value as LayerNameValue));
  }

  equals(other: LayerName): boolean {
    return this.value === other.value;
  }

  canDependOn(target: LayerName): boolean {
    return ALLOWED_DEPENDENCIES[this.value].includes(target.value);
  }

  toPathSegment(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
