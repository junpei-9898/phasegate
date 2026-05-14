/**
 * @layer infrastructure
 * @unit skill-quality
 * @work-item-id WI-188
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import type { CoverageRunnerPort } from '../../domain/ports/coverage-runner-port.js';
import { CodeCoverageResult } from '../../domain/value-objects/code-coverage-result.js';
import { SkillQualityError } from '../../domain/errors/skill-quality-error.js';

interface CoverageSummary {
  total: {
    lines: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
  };
}

function parseCoverageSummary(coverageSummaryPath: string): CodeCoverageResult {
  if (!existsSync(coverageSummaryPath)) {
    throw new SkillQualityError(
      'INVALID_COVERAGE_REPORT',
      `Coverage summary not found at ${coverageSummaryPath}. Run: pnpm test --coverage first.`,
    );
  }
  try {
    const raw = readFileSync(coverageSummaryPath, 'utf-8');
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
  constructor(
    private readonly projectRoot: string = process.cwd(),
    private readonly execFile: typeof execFileSync = execFileSync,
  ) {}

  async run(_storyId: string): Promise<CodeCoverageResult> {
    const coverageSummaryPath = path.join(this.projectRoot, '.harness', 'coverage-summary.json');
    const coverageReportsDir = path.join(this.projectRoot, '.harness');
    const vitestBin = path.join(this.projectRoot, 'node_modules', '.bin', 'vitest');

    // Use pre-existing summary if available
    if (existsSync(coverageSummaryPath)) {
      return parseCoverageSummary(coverageSummaryPath);
    }

    if (!existsSync(vitestBin) && !existsSync(path.join(this.projectRoot, 'node_modules', 'vitest', 'package.json'))) {
      throw new SkillQualityError(
        'COVERAGE_RUN_FAILED',
        'Install vitest locally before running coverage: npm install -D vitest @vitest/coverage-v8',
      );
    }

    // Run the local Vitest binary only; never use npx auto-install.
    try {
      this.execFile(
        vitestBin,
        ['run', '--coverage', '--coverage.reporter=json-summary', `--coverage.reportsDirectory=${coverageReportsDir}`],
        { stdio: 'pipe', cwd: this.projectRoot },
      );
      return parseCoverageSummary(coverageSummaryPath);
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
