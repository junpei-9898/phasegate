/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { CLEAN_PRESET_SPEC, type ArchitectureSpec } from './architecture-spec.js';
import { LayerName } from './layer-name.js';

type LayerBoundaryProps = {
  readonly sourceLayer: LayerName;
  readonly targetLayer: LayerName;
  readonly allowed: boolean;
};

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

  static standardMatrix(spec: ArchitectureSpec = CLEAN_PRESET_SPEC): readonly LayerBoundary[] {
    return Object.freeze(
      spec.layers.flatMap((source) => {
        const sourceLayer = LayerName.fromString(source, spec);

        return spec.layers.map((target) =>
          LayerBoundary.create({
            sourceLayer,
            targetLayer: LayerName.fromString(target, spec),
            allowed: sourceLayer.canDependOn(LayerName.fromString(target, spec)),
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
