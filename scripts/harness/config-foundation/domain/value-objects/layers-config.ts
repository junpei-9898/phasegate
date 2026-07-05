/**
 * @layer domain
 * @unit config-foundation
 *
 * LayersConfig値オブジェクト - L1〜L4の4レイヤー設定を保持する
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';
import { L1Config } from './l1-config.js';
import { L2Config } from './l2-config.js';
import { L3Config } from './l3-config.js';
import { L4Config } from './l4-config.js';

interface ResolvedLayersDocument {
  L1: { enabled: boolean; rules: Record<string, string> };
  L2: { enabled: boolean; validators: string[] };
  L3: { enabled: boolean; validators: string[]; coverageThreshold: number; requirementMatrixPath?: string; acBoundStories?: readonly string[] };
  L4: { enabled: boolean; validators: string[]; schedule: string };
}

interface LayersConfigProps {
  readonly L1: L1Config;
  readonly L2: L2Config;
  readonly L3: L3Config;
  readonly L4: L4Config;
}

export class LayersConfig {
  readonly L1: L1Config;
  readonly L2: L2Config;
  readonly L3: L3Config;
  readonly L4: L4Config;

  constructor(props: LayersConfigProps) {
    if (!props.L1) {
      throw new ConfigValidationError('LayersConfig: L1 is required');
    }
    if (!props.L2) {
      throw new ConfigValidationError('LayersConfig: L2 is required');
    }
    if (!props.L3) {
      throw new ConfigValidationError('LayersConfig: L3 is required');
    }
    if (!props.L4) {
      throw new ConfigValidationError('LayersConfig: L4 is required');
    }
    this.L1 = props.L1;
    this.L2 = props.L2;
    this.L3 = props.L3;
    this.L4 = props.L4;
    Object.freeze(this);
  }

  static create(raw: ResolvedLayersDocument): LayersConfig {
    if (!raw.L1) {
      throw new ConfigValidationError('LayersConfig: L1 is required');
    }
    if (!raw.L2) {
      throw new ConfigValidationError('LayersConfig: L2 is required');
    }
    if (!raw.L3) {
      throw new ConfigValidationError('LayersConfig: L3 is required');
    }
    if (!raw.L4) {
      throw new ConfigValidationError('LayersConfig: L4 is required');
    }
    return new LayersConfig({
      L1: L1Config.create(raw.L1),
      L2: L2Config.create(raw.L2),
      L3: L3Config.create(raw.L3),
      L4: L4Config.create(raw.L4),
    });
  }

  get(layerId: 'L1' | 'L2' | 'L3' | 'L4'): L1Config | L2Config | L3Config | L4Config {
    return this[layerId];
  }

  equals(other: LayersConfig): boolean {
    return (
      this.L1.equals(other.L1) &&
      this.L2.equals(other.L2) &&
      this.L3.equals(other.L3) &&
      this.L4.equals(other.L4)
    );
  }
}
