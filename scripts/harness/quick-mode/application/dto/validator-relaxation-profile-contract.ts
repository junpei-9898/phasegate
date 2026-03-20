/**
 * @layer application
 * @unit quick-mode
 *
 * validator-system向け緩和プロファイル公開 DTO
 */

export interface ValidatorRelaxationProfileContract {
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
