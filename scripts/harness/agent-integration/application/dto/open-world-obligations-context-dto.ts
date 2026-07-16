// @unit agent-integration
// @layer application
// @work-item-id WI-304

export type OpenWorldObligationClassification =
  | "new-structural"
  | "invalid-declaration"
  | "expired-waiver"
  | "policy-diagnostic"
  | "cleanup-required"
  | "waived";

export interface OpenWorldObligationContextItemDto {
  readonly kind: "structural" | "cleanup-required" | "policy-diagnostic";
  readonly classification: OpenWorldObligationClassification;
  readonly ruleId: string | null;
  readonly constraintId: string | null;
  readonly violationFingerprint: string | null;
  readonly subjectId: string | null;
  readonly policyCode?: string | null;
}

export type OpenWorldObligationsContextDto =
  | { readonly status: "disabled" }
  | { readonly status: "unavailable" }
  | {
      readonly status: "available";
      readonly entries: readonly OpenWorldObligationContextItemDto[];
      readonly adoptedLegacyCount: number;
    };
