// @unit validator-system
// @layer infrastructure
// @work-item-id WI-302

import { createWorldModelModule, type WorldResolvedConfigInput } from "../../../world-model/index.js";
import type {
  WorldConstraintRederivationObservation,
  WorldConstraintRederivationPolicyPort,
} from "../../domain/ports/world-constraint-rederivation-policy-port.js";

interface Options {
  readonly rootDir: string;
  readonly resolvedConfig?: WorldResolvedConfigInput;
}

export class WorldModelConstraintRederivationAdapter implements WorldConstraintRederivationPolicyPort {
  constructor(private readonly options: Options) {}

  async collect(): Promise<WorldConstraintRederivationObservation> {
    const module = createWorldModelModule({
      rootDir: this.options.rootDir,
      resolvedConfig: this.options.resolvedConfig,
    });
    const actual = await module.deriveWorldObligationsUseCase.execute({ writeReport: false });
    const constraintsPath =
      this.options.resolvedConfig?.declarations?.constraintsPath ?? "phasegate.world-constraints.json";
    if (actual.status === "execution-failure") {
      return Object.freeze({
        obligations: Object.freeze([]),
        diagnostics: Object.freeze(
          actual.diagnostics.map((item) =>
            Object.freeze({
              code: item.code,
              path: item.path,
              message: item.message,
              scope: item.path === constraintsPath ? ("constraint" as const) : ("other" as const),
            }),
          ),
        ),
      });
    }
    return Object.freeze({
      obligations: Object.freeze(
        actual.result.report.structuralObligations.map((item) =>
          Object.freeze({
            ruleId: item.ruleId,
            violationFingerprint: item.violationFingerprint,
            constraintId: item.constraintId,
            classification: item.classification,
          }),
        ),
      ),
      diagnostics: Object.freeze([]),
    });
  }
}
