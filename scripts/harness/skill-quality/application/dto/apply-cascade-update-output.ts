/**
 * @layer application
 * @unit skill-quality
 */
export interface ApplyCascadeUpdateOutput {
  readonly updatedCount: number;
  readonly appliedStoryIds: readonly string[];
  readonly errors: readonly string[];
}
