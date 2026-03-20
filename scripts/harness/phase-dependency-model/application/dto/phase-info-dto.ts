/**
 * @layer application
 * @unit phase-dependency-model
 */

export interface PhaseInfoDto {
  readonly unitId: string;
  readonly storyId?: string;
  readonly currentLevel: 1 | 2 | 3;
  readonly completedNodes: readonly string[];
  readonly nextNodes: readonly string[];
  readonly blockers: readonly string[];
}
