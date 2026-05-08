/**
 * @layer domain
 * @unit validator-system
 *
 * ValidatorConfigPort — HarnessConfigV2からLayerConfig取得
 */
import type { LayerConfig } from '../value-objects/layer-config.js';

export interface ValidatorConfigPort {
  getLayerConfig(layer: 'L2' | 'L3' | 'L4'): Promise<LayerConfig>;
}
