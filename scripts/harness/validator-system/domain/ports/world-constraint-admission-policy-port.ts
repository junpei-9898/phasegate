// @unit validator-system
// @layer domain
// @work-item-id WI-301

export type WorldAdmissionClassification = "adopted-legacy" | "new-structural" | "invalid-declaration" | "waived";

export interface WorldConstraintAdmissionObligation {
  readonly ruleId: string;
  readonly violationFingerprint: string;
  readonly constraintId: string | null;
  readonly classification: WorldAdmissionClassification;
}

export interface WorldConstraintAdmissionDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly scope: "constraint" | "other";
}

export interface WorldConstraintAdmissionObservation {
  readonly obligations: readonly WorldConstraintAdmissionObligation[];
  readonly diagnostics: readonly WorldConstraintAdmissionDiagnostic[];
}

export interface WorldConstraintAdmissionPolicyPort {
  collect(): Promise<WorldConstraintAdmissionObservation>;
}
