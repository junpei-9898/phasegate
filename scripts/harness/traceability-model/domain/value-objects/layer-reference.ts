/**
 * @layer domain
 * @unit traceability-model
 *
 * @layerタグから解釈したレイヤー参照
 */
import { LAYER_NAMES } from '../constants/layer-names.js';

const VALID_LAYER_NAME_SET = new Set<string>(LAYER_NAMES);
const LEGACY_LAYER_NAME_SET = new Set<string>(['port', 'usecase', 'controller']);

export class LayerReference {
  readonly layerName: string;
  readonly valid: boolean;

  private constructor(layerName: string, valid: boolean) {
    this.layerName = layerName;
    this.valid = valid;
    Object.freeze(this);
  }

  static parse(layerName: string): LayerReference {
    const normalizedLayerName = layerName.trim();
    const valid =
      VALID_LAYER_NAME_SET.has(normalizedLayerName) && !LEGACY_LAYER_NAME_SET.has(normalizedLayerName);

    return new LayerReference(normalizedLayerName, valid);
  }

  isValid(): boolean {
    return this.valid;
  }

  toString(): string {
    return this.layerName;
  }

  equals(other: LayerReference): boolean {
    return this.layerName === other.layerName && this.valid === other.valid;
  }
}
