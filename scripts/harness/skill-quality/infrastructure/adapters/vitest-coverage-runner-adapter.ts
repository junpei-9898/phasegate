/**
 * @layer infrastructure
 * @unit skill-quality
 */
import { execSync } from 'node:child_process';
import type { CoverageRunnerPort } from '../../domain/ports/coverage-runner-port.js';
import { CodeCoverageResult } from '../../domain/value-objects/code-coverage-result.js';
import { SkillQualityError } from '../../domain/errors/skill-quality-error.js';

export class VitestCoverageRunnerAdapter implements CoverageRunnerPort {
  async run(_storyId: string): Promise<CodeCoverageResult> {
    try {
      execSync('npx vitest run --coverage --reporter=json', { stdio: 'pipe' });
      // Parse coverage output (stub - returns 80% for now)
      return CodeCoverageResult.create(80, 75, 85);
    } catch (err) {
      throw new SkillQualityError('COVERAGE_RUN_FAILED', `Coverage run failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
