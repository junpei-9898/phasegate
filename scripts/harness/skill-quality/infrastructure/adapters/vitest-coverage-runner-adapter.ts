/**
 * @layer infrastructure
 * @unit skill-quality
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import type { CoverageRunnerPort } from '../../domain/ports/coverage-runner-port.js';
import { CodeCoverageResult } from '../../domain/value-objects/code-coverage-result.js';
import { SkillQualityError } from '../../domain/errors/skill-quality-error.js';

const COVERAGE_SUMMARY_PATH = path.join(process.cwd(), '.harness', 'coverage-summary.json');
const COVERAGE_REPORTS_DIR = path.join(process.cwd(), '.harness');

interface CoverageSummary {
  total: {
    lines: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
  };
}

function parseCoverageSummary(): CodeCoverageResult {
  if (!existsSync(COVERAGE_SUMMARY_PATH)) {
    throw new SkillQualityError(
      'INVALID_COVERAGE_REPORT',
      `Coverage summary not found at ${COVERAGE_SUMMARY_PATH}. Run: pnpm test --coverage first.`,
    );
  }
  try {
    const raw = readFileSync(COVERAGE_SUMMARY_PATH, 'utf-8');
    const data = JSON.parse(raw) as CoverageSummary;
    const line = Math.round(data.total.lines.pct);
    const branch = Math.round(data.total.branches.pct);
    const fn = Math.round(data.total.functions.pct);
    return CodeCoverageResult.create(line, branch, fn);
  } catch (err) {
    throw new SkillQualityError(
      'INVALID_COVERAGE_REPORT',
      `Failed to parse coverage summary: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export class VitestCoverageRunnerAdapter implements CoverageRunnerPort {
  async run(_storyId: string): Promise<CodeCoverageResult> {
    // Use pre-existing summary if available
    if (existsSync(COVERAGE_SUMMARY_PATH)) {
      return parseCoverageSummary();
    }

    // Try to run vitest coverage (requires @vitest/coverage-v8)
    try {
      execSync(
        `npx vitest run --coverage --coverage.reporter=json-summary "--coverage.reportsDirectory=${COVERAGE_REPORTS_DIR}"`,
        { stdio: 'pipe', cwd: process.cwd() },
      );
      return parseCoverageSummary();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('coverage-v8') || msg.includes('MISSING DEPENDENCY')) {
        throw new SkillQualityError(
          'COVERAGE_RUN_FAILED',
          'Install @vitest/coverage-v8 to enable coverage: pnpm add -D @vitest/coverage-v8',
        );
      }
      throw new SkillQualityError('COVERAGE_RUN_FAILED', `Coverage run failed: ${msg}`);
    }
  }
}
