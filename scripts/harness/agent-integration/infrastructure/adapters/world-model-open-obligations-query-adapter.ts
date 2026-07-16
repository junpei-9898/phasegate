// @unit agent-integration
// @layer infrastructure
// @work-item-id WI-304

import { createWorldModelModule, type WorldResolvedConfigInput } from "../../../world-model/index.js";
import type {
  QueriedWorldObligationEntry,
  WorldObligationsQueryPort,
  WorldObligationsQueryResult,
} from "../../application/ports/world-obligations-query-port.js";

interface Options {
  readonly rootDir: string;
  readonly resolvedConfig?: WorldResolvedConfigInput;
}

export class WorldModelOpenObligationsQueryAdapter implements WorldObligationsQueryPort {
  constructor(private readonly options: Options) {}

  async query(): Promise<WorldObligationsQueryResult> {
    try {
      const world = createWorldModelModule(this.options);
      const derived = await world.deriveWorldObligationsUseCase.execute({ writeReport: false });
      if (derived.status !== "derived") return { status: "unavailable" };

      const report = derived.result.report;
      const entries: QueriedWorldObligationEntry[] = [
        ...report.structuralObligations.map((entry) => ({
          kind: "structural" as const,
          classification: entry.classification,
          ruleId: entry.ruleId,
          constraintId: entry.constraintId,
          violationFingerprint: entry.violationFingerprint,
        })),
        ...report.repaidBaselineEntries.map((entry) => ({
          kind: "cleanup-required" as const,
          classification: "cleanup-required" as const,
          ruleId: entry.ruleId,
          constraintId: entry.constraintId,
          violationFingerprint: entry.violationFingerprint,
        })),
        ...report.policyDiagnostics.map((entry) => ({
          kind: "policy-diagnostic" as const,
          classification:
            entry.code === "expired-waiver" ? ("expired-waiver" as const) : ("policy-diagnostic" as const),
          ruleId: null,
          constraintId: null,
          violationFingerprint: null,
          subjectId: entry.subjectId,
          policyCode: entry.code,
        })),
      ];
      return { status: "available", entries: Object.freeze(entries) };
    } catch {
      return { status: "unavailable" };
    }
  }
}
