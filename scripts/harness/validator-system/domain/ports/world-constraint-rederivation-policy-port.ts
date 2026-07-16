// @unit validator-system
// @layer domain
// @work-item-id WI-302

import type { WorldConstraintAdmissionObservation } from "./world-constraint-admission-policy-port.js";

export type WorldConstraintRederivationObservation = WorldConstraintAdmissionObservation;

export interface WorldConstraintRederivationPolicyPort {
  collect(): Promise<WorldConstraintRederivationObservation>;
}
