// @unit agent-integration
// @layer domain
// @work-item-id WI-206

export interface FullModeSessionQueryInput {
  readonly targetFilePaths: readonly string[];
  readonly unitId?: string;
  readonly dominantCategory?: string;
}

export interface FullModeSessionQueryResult {
  readonly active: boolean;
  readonly allowed: boolean;
  readonly reason?: string;
  readonly workItemId?: string;
  readonly unit?: string;
  readonly expiresAt?: string;
}

export interface FullModeSessionQueryPort {
  check(input: FullModeSessionQueryInput): Promise<FullModeSessionQueryResult>;
}
