// @unit installation
// @layer domain
// @work-item-id WI-330

export const CONFIG_STATUSES = ["missing", "invalid-json", "invalid-schema", "valid"] as const;

export type ConfigStatus = (typeof CONFIG_STATUSES)[number];

export function isConfigStatus(value: string): value is ConfigStatus {
  return (CONFIG_STATUSES as readonly string[]).includes(value);
}

export interface ConfigStatusProbeResult {
  readonly status: ConfigStatus;
  readonly configPath: string;
  readonly detail: string | null;
}
