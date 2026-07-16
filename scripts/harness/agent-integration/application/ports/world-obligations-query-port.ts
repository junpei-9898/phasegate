// @unit agent-integration
// @layer application
// @work-item-id WI-304

export type QueriedWorldObligationClassification =
  | "adopted-legacy"
  | "new-structural"
  | "invalid-declaration"
  | "expired-waiver"
  | "policy-diagnostic"
  | "cleanup-required"
  | "waived";

export interface QueriedWorldObligationEntry {
  readonly kind: "structural" | "cleanup-required" | "policy-diagnostic";
  readonly classification: QueriedWorldObligationClassification;
  readonly ruleId: string | null;
  readonly constraintId: string | null;
  readonly violationFingerprint: string | null;
  readonly subjectId?: string | null;
  readonly policyCode?: string | null;
}

export type WorldObligationsQueryResult =
  | { readonly status: "available"; readonly entries: readonly QueriedWorldObligationEntry[] }
  | { readonly status: "unavailable" };

export interface WorldObligationsQueryPort {
  query(): Promise<WorldObligationsQueryResult>;
}
