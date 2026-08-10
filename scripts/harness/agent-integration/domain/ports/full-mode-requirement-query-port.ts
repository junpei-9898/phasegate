// @unit agent-integration
// @layer domain
// @work-item-id WI-384

export interface FullModeRequirementQueryResult {
  readonly requiresFullMode: boolean;
  readonly rejectionRule?: 'CATEGORY_NOT_ALLOWED' | 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  readonly rejectionReason?: string;
  readonly dominantCategory?: string;
}

export interface FullModeTargetChange {
  readonly filePath: string;
  readonly changeKind?: 'CREATE' | 'MODIFY' | 'DELETE';
  readonly beforeContent?: string | null;
  readonly afterContent?: string | null;
}

export interface FullModeRequirementQueryPort {
  check(
    targetFilePaths: readonly string[],
    targetChanges?: readonly FullModeTargetChange[],
  ): Promise<FullModeRequirementQueryResult>;
}
