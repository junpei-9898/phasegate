/**
 * @layer application
 * @unit ci-governance
 */

export interface AggregateLessonsOutput {
  readonly pointerEntries: Array<{ key: string; type: string; filePath?: string; description: string }>;
  readonly totalArtifacts: number;
  readonly errors: Array<{ code: string; message: string }>;
}
