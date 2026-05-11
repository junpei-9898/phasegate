// @unit installation
// @layer domain
// @work-item-id WI-145

export const REPAIR_MODES = ["mechanical", "ai-assisted", "manual"] as const;

export type RepairMode = (typeof REPAIR_MODES)[number];

export function isRepairMode(value: string): value is RepairMode {
  return (REPAIR_MODES as readonly string[]).includes(value);
}
