/**
 * @layer domain
 * @unit skill-quality
 */

export interface ConfigQueryPort {
  getCoverageThreshold(): Promise<{ requirement: number; code: number }>;
  isAgentLessonCollectionEnabled(): Promise<boolean>;
  getCascadeUpdateTargetPatterns(): Promise<readonly string[]>;
}
