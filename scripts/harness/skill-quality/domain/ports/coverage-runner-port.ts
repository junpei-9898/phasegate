/**
 * @layer domain
 * @unit skill-quality
 */
import type { CodeCoverageResult } from '../value-objects/code-coverage-result.js';

export interface CoverageRunnerPort {
  run(storyId: string): Promise<CodeCoverageResult>;
}
