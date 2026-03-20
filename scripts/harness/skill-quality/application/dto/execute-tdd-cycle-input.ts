/**
 * @layer application
 * @unit skill-quality
 */
export interface ExecuteTddCycleInput {
  readonly unit: string;
  readonly storyId: string;
  readonly description: string;
  readonly phase: 'RED' | 'GREEN' | 'REFACTOR';
  readonly passed: boolean;
}
