// @unit agent-integration
// @layer domain

export interface FullModeRequirementQueryResult {
  readonly requiresFullMode: boolean;
  readonly rejectionRule?: 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  readonly rejectionReason?: string;
  readonly dominantCategory?: string;
}

export interface FullModeTargetChange {
  readonly filePath: string;
  readonly beforeContent?: string | null;
  readonly afterContent?: string | null;
}

export interface FullModeRequirementQueryPort {
  check(
    targetFilePaths: readonly string[],
    targetChanges?: readonly FullModeTargetChange[],
  ): Promise<FullModeRequirementQueryResult>;
}
