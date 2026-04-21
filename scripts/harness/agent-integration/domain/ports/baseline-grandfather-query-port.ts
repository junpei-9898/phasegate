// @unit agent-integration
// @layer domain

export interface BaselineGrandfatherCheckResult {
  readonly allGrandfathered: boolean;
  readonly baselineEnabled: boolean;
  readonly grandfatheredPaths: readonly string[];
}

export interface BaselineGrandfatherQueryPort {
  check(targetFilePaths: readonly string[]): Promise<BaselineGrandfatherCheckResult>;
}
