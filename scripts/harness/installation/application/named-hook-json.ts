// @unit installation
// @layer application
// @work-item-id WI-385

export const PHASEGATE_NAMED_HOOK = "phasegate-gate";

export function mergeNamedHookJson(
  existing: Readonly<Record<string, unknown>>,
  incoming: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const owned = incoming[PHASEGATE_NAMED_HOOK];
  return owned === undefined ? { ...existing } : { ...existing, [PHASEGATE_NAMED_HOOK]: owned };
}

export function removeNamedHookJson(existing: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(existing).filter(([key]) => key !== PHASEGATE_NAMED_HOOK));
}
