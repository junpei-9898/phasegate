// @unit validator-system
// @layer domain
// @work-item-id WI-302

import type { WorldAdmissionClassification } from "../ports/world-constraint-admission-policy-port.js";
import type { WorldConstraintRederivationObservation } from "../ports/world-constraint-rederivation-policy-port.js";

export interface WorldConstraintRederivationFinding {
  readonly severity: "error" | "warning";
  readonly ruleId: string | null;
  readonly violationFingerprint: string | null;
  readonly constraintId: string | null;
  readonly classification:
    | WorldAdmissionClassification
    | "constraint-input-invalid"
    | "authoritative-evaluation-failed";
  readonly message: string;
  readonly suggestion: string;
  readonly sourcePath: string | null;
}

const REPAIR_SUGGESTION =
  "Repair the versioned declaration or current corpus finding, then rerun authoritative L3 clean-corpus re-derivation.";

const compareNullable = (left: string | null, right: string | null): number =>
  (left ?? "") < (right ?? "") ? -1 : (left ?? "") > (right ?? "") ? 1 : 0;

export class WorldConstraintRederivationService {
  evaluate(observation: WorldConstraintRederivationObservation): readonly WorldConstraintRederivationFinding[] {
    const obligationFindings = observation.obligations.map((obligation): WorldConstraintRederivationFinding => {
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
        message: `L3 authoritative clean-corpus re-derivation reports ${label}: ${obligation.ruleId} ${obligation.violationFingerprint}.`,
        suggestion: REPAIR_SUGGESTION,
        sourcePath: null,
      });
    });
    const diagnosticFindings = observation.diagnostics.map((item): WorldConstraintRederivationFinding => {
      const constraintInput = item.scope === "constraint";
      return Object.freeze({
        severity: "error",
        ruleId: constraintInput ? "WCR-001" : null,
        violationFingerprint: null,
        constraintId: null,
        classification: constraintInput ? "constraint-input-invalid" : "authoritative-evaluation-failed",
        message: `L3 authoritative clean-corpus re-derivation cannot produce a trustworthy result (${item.code}): ${item.message}.`,
        suggestion: REPAIR_SUGGESTION,
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
