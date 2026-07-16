// @unit validator-system
// @layer domain
// @work-item-id WI-301

import type {
  WorldAdmissionClassification,
  WorldConstraintAdmissionObservation,
} from "../ports/world-constraint-admission-policy-port.js";

export interface WorldConstraintAdmissionFinding {
  readonly severity: "error" | "warning";
  readonly ruleId: string | null;
  readonly violationFingerprint: string | null;
  readonly constraintId: string | null;
  readonly classification: WorldAdmissionClassification | "constraint-input-invalid" | "local-evaluation-incomplete";
  readonly message: string;
  readonly suggestion: string;
  readonly sourcePath: string | null;
}

const LOCAL_TRUST_NOTICE = "Local L2 evidence can be forged; authoritative L3 re-derivation is required.";
const AUTHORITATIVE_SUGGESTION =
  "Repair the declaration or structural finding, then rely on authoritative L3 clean-corpus re-derivation.";

const compareNullable = (left: string | null, right: string | null): number =>
  (left ?? "") < (right ?? "") ? -1 : (left ?? "") > (right ?? "") ? 1 : 0;

export class WorldConstraintAdmissionService {
  evaluate(observation: WorldConstraintAdmissionObservation): readonly WorldConstraintAdmissionFinding[] {
    const obligationFindings = observation.obligations.map((obligation): WorldConstraintAdmissionFinding => {
      const blocking =
        obligation.classification === "new-structural" || obligation.classification === "invalid-declaration";
      const label =
        obligation.classification === "invalid-declaration"
          ? "non-adoptable invalid World constraint declaration"
          : obligation.classification === "new-structural"
            ? "new World structural violation"
            : obligation.classification === "adopted-legacy"
              ? "adopted legacy World violation"
              : "actively waived World violation";
      return Object.freeze({
        severity: blocking ? "error" : "warning",
        ruleId: obligation.ruleId,
        violationFingerprint: obligation.violationFingerprint,
        constraintId: obligation.constraintId,
        classification: obligation.classification,
        message: `L2 local fast-path reports ${label}: ${obligation.ruleId} ${obligation.violationFingerprint}. ${LOCAL_TRUST_NOTICE}`,
        suggestion: AUTHORITATIVE_SUGGESTION,
        sourcePath: null,
      });
    });
    const diagnosticFindings = observation.diagnostics.map((item): WorldConstraintAdmissionFinding => {
      const constraintInput = item.scope === "constraint";
      return Object.freeze({
        severity: constraintInput ? "error" : "warning",
        ruleId: constraintInput ? "WCR-001" : null,
        violationFingerprint: null,
        constraintId: null,
        classification: constraintInput ? "constraint-input-invalid" : "local-evaluation-incomplete",
        message: constraintInput
          ? `L2 local fast-path cannot admit constraint declaration input (${item.code}): ${item.message}. ${LOCAL_TRUST_NOTICE}`
          : `L2 local fast-path could not complete non-constraint policy observation (${item.code}): ${item.message}. ${LOCAL_TRUST_NOTICE}`,
        suggestion: AUTHORITATIVE_SUGGESTION,
        sourcePath: item.path,
      });
    });

    return Object.freeze(
      [...obligationFindings, ...diagnosticFindings].sort(
        (left, right) =>
          compareNullable(left.ruleId, right.ruleId) ||
          compareNullable(left.violationFingerprint, right.violationFingerprint) ||
          compareNullable(left.sourcePath, right.sourcePath) ||
          left.classification.localeCompare(right.classification),
      ),
    );
  }
}
