/**
 * @layer application
 * @unit validator-system
 *
 * ValidatorRelaxationProfile — quick-mode 緩和プロファイルDTO
 */

export interface ValidatorRelaxationProfile {
  readonly levelDependencyRelaxed: false;
  readonly l1: { readonly all: true };
  readonly l2: {
    readonly maintained: readonly string[];
    readonly skipped: readonly string[];
  };
  readonly l3: {
    readonly maintained: readonly string[];
    readonly skipped: readonly string[];
  };
  readonly l4: { readonly all: false };
  readonly phaseExecution: { readonly twoPhaseRequired: false };
}
