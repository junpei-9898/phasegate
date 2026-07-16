// @unit agent-integration
// @layer application
// @work-item-id WI-304

import type {
  OpenWorldObligationContextItemDto,
  OpenWorldObligationsContextDto,
} from "../dto/open-world-obligations-context-dto.js";
import type { QueriedWorldObligationEntry, WorldObligationsQueryPort } from "../ports/world-obligations-query-port.js";

interface Dependencies {
  readonly worldObligationsQueryPort: WorldObligationsQueryPort;
}

const priority = (entry: OpenWorldObligationContextItemDto): number => {
  if (entry.classification === "new-structural" || entry.classification === "invalid-declaration") return 0;
  if (entry.classification === "expired-waiver" || entry.classification === "policy-diagnostic") return 1;
  if (entry.classification === "cleanup-required") return 2;
  return 3;
};

const stableKey = (entry: OpenWorldObligationContextItemDto): string =>
  [
    priority(entry).toString().padStart(2, "0"),
    entry.ruleId ?? "",
    entry.constraintId ?? "",
    entry.violationFingerprint ?? "",
    entry.subjectId ?? "",
    entry.policyCode ?? "",
  ].join("\u0000");

type DisplayableQueriedEntry = QueriedWorldObligationEntry & {
  readonly classification: Exclude<QueriedWorldObligationEntry["classification"], "adopted-legacy">;
};

const isDisplayable = (entry: QueriedWorldObligationEntry): entry is DisplayableQueriedEntry =>
  entry.classification !== "adopted-legacy";

const toContextItem = (entry: DisplayableQueriedEntry): OpenWorldObligationContextItemDto => ({
  kind: entry.kind,
  classification: entry.classification,
  ruleId: entry.ruleId,
  constraintId: entry.constraintId,
  violationFingerprint: entry.violationFingerprint,
  subjectId: entry.subjectId ?? null,
  policyCode: entry.policyCode ?? null,
});

export class GetOpenWorldObligationsContextUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(input: { readonly enabled: boolean }): Promise<OpenWorldObligationsContextDto> {
    if (!input.enabled) return { status: "disabled" };

    const result = await this.dependencies.worldObligationsQueryPort.query();
    if (result.status === "unavailable") return { status: "unavailable" };

    const adoptedLegacyCount = result.entries.filter((entry) => entry.classification === "adopted-legacy").length;
    const entries = result.entries
      .filter(isDisplayable)
      .map(toContextItem)
      .sort((left, right) => (stableKey(left) < stableKey(right) ? -1 : stableKey(left) > stableKey(right) ? 1 : 0));

    return { status: "available", entries: Object.freeze(entries), adoptedLegacyCount };
  }
}
