// layer-health.ts — LayerHealth Value Object

export type LayerId = 'L1' | 'L2' | 'L3' | 'L4';
type LastResult = 'pass' | 'fail' | 'unknown' | undefined;

const VALID_LAYER_IDS: readonly LayerId[] = ['L1', 'L2', 'L3', 'L4'];
const VALID_LAST_RESULTS: readonly string[] = ['pass', 'fail', 'unknown'];

export interface LayerHealthProps {
  layerId: string;
  enabled: boolean;
  lastResult?: string;
}

export class LayerHealth {
  readonly layerId: LayerId;
  readonly enabled: boolean;
  readonly lastResult: LastResult;

  private constructor(layerId: LayerId, enabled: boolean, lastResult: LastResult) {
    this.layerId = layerId;
    this.enabled = enabled;
    this.lastResult = lastResult;
    Object.freeze(this);
  }

  static create(props: LayerHealthProps): LayerHealth {
    if (!VALID_LAYER_IDS.includes(props.layerId as LayerId)) {
      throw new Error(`HarnessApiDomainError: invalid layerId '${props.layerId}'. Must be L1, L2, L3, or L4`);
    }
    if (props.lastResult !== undefined && !VALID_LAST_RESULTS.includes(props.lastResult)) {
      throw new Error(`HarnessApiDomainError: invalid lastResult '${props.lastResult}'. Must be pass, fail, or unknown`);
    }
    return new LayerHealth(
      props.layerId as LayerId,
      props.enabled,
      props.lastResult as LastResult
    );
  }

  isActionable(): boolean {
    return this.enabled === true && this.lastResult !== 'unknown';
  }
}
