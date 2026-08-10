// @unit installation
// @layer domain
// @work-item-id WI-390

export type HuskyRuntimeInactiveReason = 'hooks-path-unset' | 'hooks-path-unsupported' | 'shim-missing';

export type HuskyRuntimeKind = 'active' | 'inactive' | 'unavailable';

export class HuskyRuntimeState {
  private constructor(
    readonly kind: HuskyRuntimeKind,
    readonly hooksPath: string | null,
    readonly reason: HuskyRuntimeInactiveReason | null,
    readonly detail: string | null,
  ) {
    Object.freeze(this);
  }

  static active(hooksPath: '.husky' | '.husky/_'): HuskyRuntimeState {
    return new HuskyRuntimeState('active', hooksPath, null, null);
  }

  static inactive(reason: HuskyRuntimeInactiveReason, hooksPath: string | null): HuskyRuntimeState {
    return new HuskyRuntimeState('inactive', hooksPath, reason, null);
  }

  static unavailable(detail: string): HuskyRuntimeState {
    return new HuskyRuntimeState('unavailable', null, null, detail);
  }

  isActive(): boolean {
    return this.kind === 'active';
  }
}
