/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { LayerName } from './layer-name.js';

type LayerBoundaryProps = {
  readonly sourceLayer: LayerName;
  readonly targetLayer: LayerName;
  readonly allowed: boolean;
};

const LAYER_NAMES = Object.freeze(['domain', 'application', 'infrastructure', 'presentation'] as const);

export class LayerBoundary {
  readonly sourceLayer: LayerName;
  readonly targetLayer: LayerName;
  readonly allowed: boolean;

  private constructor(props: LayerBoundaryProps) {
    this.sourceLayer = props.sourceLayer;
    this.targetLayer = props.targetLayer;
    this.allowed = props.allowed;
  }

  static create(props: LayerBoundaryProps): LayerBoundary {
    return Object.freeze(new LayerBoundary(props));
  }

  static standardMatrix(): readonly LayerBoundary[] {
    return Object.freeze(
      LAYER_NAMES.flatMap((source) => {
        const sourceLayer = LayerName.fromString(source);

        return LAYER_NAMES.map((target) =>
          LayerBoundary.create({
            sourceLayer,
            targetLayer: LayerName.fromString(target),
            allowed: sourceLayer.canDependOn(LayerName.fromString(target)),
          })
        );
      })
    );
  }

  allows(source: LayerName, target: LayerName): boolean {
    return this.sourceLayer.equals(source) && this.targetLayer.equals(target) ? this.allowed : false;
  }

  equals(other: LayerBoundary): boolean {
    return (
      this.sourceLayer.equals(other.sourceLayer) &&
      this.targetLayer.equals(other.targetLayer) &&
      this.allowed === other.allowed
    );
  }
}
