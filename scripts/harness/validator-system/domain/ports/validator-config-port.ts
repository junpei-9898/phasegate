/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-212
 *
 * ValidatorConfigPort — HarnessConfigV2からLayerConfig取得
 */
import type { LayerConfig } from '../value-objects/layer-config.js';

export interface ValidatorConfigPort {
  getLayerConfig(layer: 'L2' | 'L3' | 'L4'): Promise<LayerConfig>;
  getProjectLanguages?(): Promise<readonly string[]>;
}
