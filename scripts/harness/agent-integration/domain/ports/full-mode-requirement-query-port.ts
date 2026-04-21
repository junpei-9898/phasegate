// @unit agent-integration
// @layer domain

export interface FullModeRequirementQueryResult {
  readonly requiresFullMode: boolean;
  readonly rejectionRule?: 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  readonly rejectionReason?: string;
  readonly dominantCategory?: string;
}

export interface FullModeRequirementQueryPort {
  check(targetFilePaths: readonly string[]): Promise<FullModeRequirementQueryResult>;
}
