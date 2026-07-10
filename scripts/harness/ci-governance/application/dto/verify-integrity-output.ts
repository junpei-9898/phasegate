// @unit ci-governance
// @layer application

import type { IntegrityDrift } from "../../domain/value-objects/integrity-drift.js";

export interface VerifyIntegrityOutput {
  readonly manifestPath: string;
  readonly ok: boolean;
  readonly drifts: readonly IntegrityDrift[];
}
