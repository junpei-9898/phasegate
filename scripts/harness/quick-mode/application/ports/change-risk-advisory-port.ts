// @unit quick-mode
// @layer application
// @work-item-id WI-220
export interface ChangeRiskAdvice {
  readonly path: string;
  readonly kind: 'module-surface-change' | 'behavior-review' | 'unknown' | 'no-content-change';
  readonly source: 'caller-snapshot';
  readonly enforcement: 'none';
  readonly beforeHash: string | null;
  readonly afterHash: string | null;
  readonly reason: string;
}

export interface ChangeRiskAdvisoryPort {
  assess(paths: readonly string[], snapshotFile: string): Promise<readonly ChangeRiskAdvice[]>;
}
