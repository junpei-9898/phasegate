// @unit world-model
// @layer domain
// @work-item-id WI-295

import type { AdoptionBaseline, SemanticDebtDeclaration, WorldWaiver } from "../entities/control-declarations.js";
import type { EvaluationId } from "../value-objects/evaluation-id.js";
import type { Sha256Digest } from "../value-objects/sha256-digest.js";
import type { CanonicalJsonObject } from "./canonical-json-serializer.js";
import type { ConstraintFindingDto } from "./constraint-evaluator.js";
import type { ViolationFingerprintDeriver } from "./violation-fingerprint-deriver.js";

export type ObligationClassification = "adopted-legacy" | "new-structural" | "invalid-declaration" | "waived";

export interface DerivedStructuralObligation {
  readonly violationFingerprint: string;
  readonly ruleId: string;
  readonly constraintId: string | null;
  readonly factType: string | null;
  readonly subject: CanonicalJsonObject;
  readonly claimantPin: CanonicalJsonObject | null;
  readonly premisePin: CanonicalJsonObject | null;
  readonly expected: CanonicalJsonObject;
  readonly observed: CanonicalJsonObject;
  readonly classification: ObligationClassification;
  readonly waiver: CanonicalJsonObject | null;
}

export interface DerivedRepaidBaselineEntry {
  readonly violationFingerprint: string;
  readonly ruleId: string;
  readonly constraintId: string | null;
  readonly classification: "repaid";
  readonly disposition: "cleanup-required";
}

export interface DerivedPolicyDiagnostic {
  readonly code: string;
  readonly subjectId: string | null;
  readonly details: CanonicalJsonObject;
}

export interface DerivedObligationSummary {
  readonly structuralObligations: number;
  readonly repaidBaselineEntries: number;
  readonly declaredSemanticDebts: number;
  readonly policyDiagnostics: number;
}

export interface DerivedObligationReport {
  readonly schemaVersion: "phasegate-world-obligation-report/v1";
  readonly evaluationId: string;
  readonly rulesetVersion: string;
  readonly policyInputsDigest: string;
  readonly structuralObligations: readonly DerivedStructuralObligation[];
  readonly repaidBaselineEntries: readonly DerivedRepaidBaselineEntry[];
  readonly declaredSemanticDebts: readonly CanonicalJsonObject[];
  readonly policyDiagnostics: readonly DerivedPolicyDiagnostic[];
  readonly summary: DerivedObligationSummary;
}

export interface ObligationDerivationInput {
  readonly evaluationId: EvaluationId;
  readonly rulesetVersion: string;
  readonly policyInputsDigest: Sha256Digest;
  readonly findings: readonly ConstraintFindingDto[];
  readonly baseline: AdoptionBaseline | null;
  readonly waivers: readonly WorldWaiver[];
  readonly semanticDebts: readonly SemanticDebtDeclaration[];
  readonly policyAsOfDate: string | null;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const diagnostic = (
  code: string,
  subjectId: string | null,
  details: CanonicalJsonObject = {},
): DerivedPolicyDiagnostic => Object.freeze({ code, subjectId, details: Object.freeze(details) });

export class ObligationDerivationService {
  constructor(private readonly fingerprintDeriver: ViolationFingerprintDeriver) {}

  derive(input: ObligationDerivationInput): DerivedObligationReport {
    const baselineMatchesRuleset = input.baseline === null || input.baseline.rulesetVersion === input.rulesetVersion;
    const policyDiagnostics: DerivedPolicyDiagnostic[] = [];
    if (!baselineMatchesRuleset && input.baseline !== null) {
      policyDiagnostics.push(
        diagnostic("baseline-ruleset-mismatch", input.baseline.sourceEvaluationId.toString(), {
          baselineRulesetVersion: input.baseline.rulesetVersion,
          currentRulesetVersion: input.rulesetVersion,
        }),
      );
    }

    const baselineEntries = baselineMatchesRuleset ? (input.baseline?.entries ?? []) : [];
    const baselineFingerprints = new Set(baselineEntries.map((entry) => entry.violationFingerprint.toString()));
    const waiverByFingerprint = new Map<string, WorldWaiver>();
    for (const waiver of [...input.waivers].sort((left, right) => compareStrings(left.waiverId, right.waiverId))) {
      const active = input.policyAsOfDate !== null && input.policyAsOfDate < waiver.expiresOn;
      if (active) {
        waiverByFingerprint.set(waiver.violationFingerprint.toString(), waiver);
      } else {
        policyDiagnostics.push(
          diagnostic("expired-waiver", waiver.waiverId, {
            expiresOn: waiver.expiresOn,
            policyAsOfDate: input.policyAsOfDate,
            violationFingerprint: waiver.violationFingerprint.toString(),
          }),
        );
      }
    }

    const byFingerprint = new Map<
      string,
      { readonly finding: ConstraintFindingDto; readonly preimage: CanonicalJsonObject }
    >();
    for (const finding of input.findings) {
      const derived = this.fingerprintDeriver.derive(finding, input.rulesetVersion);
      const key = derived.fingerprint.toString();
      if (!byFingerprint.has(key)) {
        byFingerprint.set(key, { finding, preimage: derived.preimage });
      }
    }

    const structuralObligations = [...byFingerprint.entries()]
      .map(([violationFingerprint, value]): DerivedStructuralObligation => {
        const invalidDeclaration = value.finding.ruleId === "WCR-001";
        const waiver = invalidDeclaration ? null : (waiverByFingerprint.get(violationFingerprint) ?? null);
        const classification: ObligationClassification = invalidDeclaration
          ? "invalid-declaration"
          : waiver !== null
            ? "waived"
            : baselineFingerprints.has(violationFingerprint)
              ? "adopted-legacy"
              : "new-structural";
        return Object.freeze({
          violationFingerprint,
          ruleId: value.finding.ruleId,
          constraintId: value.finding.constraintId,
          factType: value.finding.factType,
          subject: value.preimage.subject as CanonicalJsonObject,
          claimantPin: value.preimage.claimantPin as CanonicalJsonObject | null,
          premisePin: value.preimage.premisePin as CanonicalJsonObject | null,
          expected: value.preimage.expected as CanonicalJsonObject,
          observed: value.preimage.observed as CanonicalJsonObject,
          classification,
          waiver:
            waiver === null
              ? null
              : Object.freeze({
                  waiverId: waiver.waiverId,
                  reason: waiver.reason,
                  expiresOn: waiver.expiresOn,
                  workItemId: waiver.workItemId,
                }),
        });
      })
      .sort((left, right) => compareStrings(left.violationFingerprint, right.violationFingerprint));

    const currentFingerprints = new Set(byFingerprint.keys());
    const repaidBaselineEntries = baselineEntries
      .filter((entry) => !currentFingerprints.has(entry.violationFingerprint.toString()))
      .map(
        (entry): DerivedRepaidBaselineEntry =>
          Object.freeze({
            violationFingerprint: entry.violationFingerprint.toString(),
            ruleId: entry.ruleId.toString(),
            constraintId: entry.constraintId?.toString() ?? null,
            classification: "repaid",
            disposition: "cleanup-required",
          }),
      )
      .sort((left, right) => compareStrings(left.violationFingerprint, right.violationFingerprint));
    const declaredSemanticDebts = [...input.semanticDebts]
      .sort((left, right) => compareStrings(left.debtId, right.debtId))
      .map((debt) => debt.toCanonicalValue());
    policyDiagnostics.sort(
      (left, right) =>
        compareStrings(left.code, right.code) || compareStrings(left.subjectId ?? "", right.subjectId ?? ""),
    );

    return Object.freeze({
      schemaVersion: "phasegate-world-obligation-report/v1",
      evaluationId: input.evaluationId.toString(),
      rulesetVersion: input.rulesetVersion,
      policyInputsDigest: input.policyInputsDigest.toString(),
      structuralObligations: Object.freeze(structuralObligations),
      repaidBaselineEntries: Object.freeze(repaidBaselineEntries),
      declaredSemanticDebts: Object.freeze(declaredSemanticDebts),
      policyDiagnostics: Object.freeze(policyDiagnostics),
      summary: Object.freeze({
        declaredSemanticDebts: declaredSemanticDebts.length,
        policyDiagnostics: policyDiagnostics.length,
        repaidBaselineEntries: repaidBaselineEntries.length,
        structuralObligations: structuralObligations.length,
      }),
    });
  }
}
