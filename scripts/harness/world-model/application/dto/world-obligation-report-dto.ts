// @unit world-model
// @layer application
// @work-item-id WI-295

import type { CanonicalJsonObject } from "../../domain/services/canonical-json-serializer.js";

export type StructuralObligationClassification = "adopted-legacy" | "new-structural" | "invalid-declaration" | "waived";

export interface StructuralObligationDto {
  readonly violationFingerprint: string;
  readonly ruleId: string;
  readonly constraintId: string | null;
  readonly factType: string | null;
  readonly subject: CanonicalJsonObject;
  readonly claimantPin: CanonicalJsonObject | null;
  readonly premisePin: CanonicalJsonObject | null;
  readonly expected: CanonicalJsonObject;
  readonly observed: CanonicalJsonObject;
  readonly classification: StructuralObligationClassification;
  readonly waiver: CanonicalJsonObject | null;
}

export interface RepaidBaselineEntryDto {
  readonly violationFingerprint: string;
  readonly ruleId: string;
  readonly constraintId: string | null;
  readonly classification: "repaid";
  readonly disposition: "cleanup-required";
}

export interface PolicyDiagnosticDto {
  readonly code: string;
  readonly subjectId: string | null;
  readonly details: CanonicalJsonObject;
}

export interface ObligationReportSummaryDto {
  readonly structuralObligations: number;
  readonly repaidBaselineEntries: number;
  readonly declaredSemanticDebts: number;
  readonly policyDiagnostics: number;
}

export interface WorldObligationReportDto {
  readonly schemaVersion: "phasegate-world-obligation-report/v1";
  readonly evaluationId: string;
  readonly rulesetVersion: string;
  readonly policyInputsDigest: string;
  readonly structuralObligations: readonly StructuralObligationDto[];
  readonly repaidBaselineEntries: readonly RepaidBaselineEntryDto[];
  readonly declaredSemanticDebts: readonly CanonicalJsonObject[];
  readonly policyDiagnostics: readonly PolicyDiagnosticDto[];
  readonly summary: ObligationReportSummaryDto;
}
