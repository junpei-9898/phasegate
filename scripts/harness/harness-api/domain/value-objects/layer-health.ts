// @layer domain
// @unit harness-api
// layer-health.ts — LayerHealth Value Object

export type LayerId = 'L1' | 'L2' | 'L3' | 'L4';
type LastResult = 'pass' | 'fail' | 'unknown' | undefined;
type ConfigurationState = 'enabled' | 'disabled';
type CachedArtifactState = 'present' | 'missing' | 'unknown';
type LiveValidationState = 'pass' | 'fail' | 'skipped' | 'not-run' | 'error';

const VALID_LAYER_IDS: readonly LayerId[] = ['L1', 'L2', 'L3', 'L4'];
const VALID_LAST_RESULTS: readonly string[] = ['pass', 'fail', 'unknown'];

export interface LayerHealthProps {
  layerId: string;
  enabled: boolean;
  lastResult?: string;
  configurationState?: ConfigurationState;
  cachedArtifactState?: CachedArtifactState;
  liveValidationState?: LiveValidationState;
}

export class LayerHealth {
  readonly layerId: LayerId;
  readonly enabled: boolean;
  readonly lastResult: LastResult;
  readonly configurationState: ConfigurationState;
  readonly cachedArtifactState: CachedArtifactState;
  readonly liveValidationState: LiveValidationState;

  private constructor(
    layerId: LayerId,
    enabled: boolean,
    lastResult: LastResult,
    configurationState: ConfigurationState,
    cachedArtifactState: CachedArtifactState,
    liveValidationState: LiveValidationState,
  ) {
    this.layerId = layerId;
    this.enabled = enabled;
    this.lastResult = lastResult;
    this.configurationState = configurationState;
    this.cachedArtifactState = cachedArtifactState;
    this.liveValidationState = liveValidationState;
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
      props.lastResult as LastResult,
      props.configurationState ?? (props.enabled ? 'enabled' : 'disabled'),
      props.cachedArtifactState ?? 'unknown',
      props.liveValidationState ?? 'not-run',
    );
  }

  isActionable(): boolean {
    return this.enabled === true && this.lastResult !== 'unknown';
  }
}
