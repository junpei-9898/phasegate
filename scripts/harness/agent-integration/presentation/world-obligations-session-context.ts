// @unit agent-integration
// @layer presentation
// @work-item-id WI-304

import type {
  OpenWorldObligationContextItemDto,
  OpenWorldObligationsContextDto,
} from "../application/dto/open-world-obligations-context-dto.js";

const UNAVAILABLE_WARNING =
  "⚠ World obligations unavailable at SessionStart; continuing fail-open. Run phasegate world:derive.";
const HEADER = "## World open obligations (SessionStart)";
const HARD_MAX_ITEMS = 5;
const HARD_MAX_CHARS = 2000;

export const countUnicodeScalars = (value: string): number => [...value].length;

const renderEntry = (entry: OpenWorldObligationContextItemDto): string => {
  if (entry.kind === "policy-diagnostic") {
    return `- [BLOCKING ${entry.classification}] subject=${entry.subjectId ?? "unknown"}`;
  }
  const label =
    entry.classification === "cleanup-required"
      ? "CLEANUP"
      : entry.classification === "waived"
        ? "WAIVED"
        : `BLOCKING ${entry.classification}`;
  return `- [${label}] ${entry.ruleId ?? "unknown-rule"} constraint=${entry.constraintId ?? "implicit"} fingerprint=${entry.violationFingerprint ?? "none"}`;
};

const renderAvailable = (
  input: Extract<OpenWorldObligationsContextDto, { status: "available" }>,
  shown: number,
): string => {
  const lines = [HEADER, ...input.entries.slice(0, shown).map(renderEntry)];
  if (input.adoptedLegacyCount > 0) lines.push(`- Adopted legacy: ${input.adoptedLegacyCount} (summary only)`);
  if (input.entries.length === 0 && input.adoptedLegacyCount === 0) lines.push("- None.");
  const omitted = input.entries.length - shown;
  if (omitted > 0) lines.push(`... ${omitted} more; run phasegate world:derive`);
  return lines.join("\n");
};

export function buildWorldObligationsSessionContext(
  input: OpenWorldObligationsContextDto,
  limits: { readonly maxItems: number; readonly maxChars: number },
): string | null {
  const maxItems = Math.min(limits.maxItems, HARD_MAX_ITEMS);
  const maxChars = Math.min(limits.maxChars, HARD_MAX_CHARS);
  if (input.status === "disabled") return null;
  if (input.status === "unavailable") {
    return countUnicodeScalars(UNAVAILABLE_WARNING) <= maxChars ? UNAVAILABLE_WARNING : null;
  }

  const maximumShown = Math.min(input.entries.length, maxItems);
  for (let shown = maximumShown; shown >= 0; shown -= 1) {
    const candidate = renderAvailable(input, shown);
    if (countUnicodeScalars(candidate) <= maxChars) return candidate;
  }
  return null;
}
