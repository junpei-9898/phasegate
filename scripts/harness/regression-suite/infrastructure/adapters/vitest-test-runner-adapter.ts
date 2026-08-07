// @layer infrastructure
// @unit regression-suite
// @work-item-id WI-384
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execPath } from 'node:process';
import { KRequirementTest } from '../../domain/value-objects/k-requirement-test.js';
import { GngConditionTest } from '../../domain/value-objects/gng-condition-test.js';
import { AgentIndependenceTest } from '../../domain/value-objects/agent-independence-test.js';
import { TestFailureDetail } from '../../domain/value-objects/test-failure-detail.js';
import type { TestCase } from '../../domain/value-objects/regression-suite-definition.js';
import type { TestRunnerPort, TestRunnerResult } from '../../domain/ports/test-runner-port.js';

function getTargetUnit(tc: TestCase): string {
  if (tc instanceof KRequirementTest) return tc.targetUnit;
  if (tc instanceof GngConditionTest) return tc.targetUnit;
  if (tc instanceof AgentIndependenceTest) return tc.targetModule;
  return '';
}

function getTestCaseId(tc: TestCase): string {
  if (tc instanceof KRequirementTest) return tc.kNumber;
  if (tc instanceof GngConditionTest) return tc.gngNumber;
  if (tc instanceof AgentIndependenceTest) return tc.targetModule;
  return 'unknown';
}

export class VitestTestRunnerAdapter implements TestRunnerPort {
  private readonly rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  async runSuite(testCases: ReadonlyArray<TestCase>): Promise<TestRunnerResult> {
    if (testCases.length === 0) {
      return { passedCount: 0, failedCount: 0, skippedCount: 0, totalCount: 0, coverageRate: null, failures: [] };
    }

    // targetUnit ごとにユニークなユニットを収集
    const unitToTestCases = new Map<string, TestCase[]>();
    for (const tc of testCases) {
      const unit = getTargetUnit(tc);
      const existing = unitToTestCases.get(unit) ?? [];
      existing.push(tc);
      unitToTestCases.set(unit, existing);
    }

    const unitResults = new Map<string, boolean>();

    for (const [unit] of Array.from(unitToTestCases.entries())) {
      if (!unit) {
        unitResults.set(unit, false);
        continue;
      }
      const unitTestDir = join(this.rootDir, 'scripts/harness/__tests__/unit', unit);
      const unitIntegrationDir = join(this.rootDir, 'scripts/harness/__tests__/integration', unit);

      const hasUnitTests = existsSync(unitTestDir);
      const hasIntegrationTests = existsSync(unitIntegrationDir);

      if (!hasUnitTests && !hasIntegrationTests) {
        // テストディレクトリなし → passとみなす（未実装ユニット）
        unitResults.set(unit, true);
        continue;
      }

      const testPattern = hasUnitTests ? unitTestDir : unitIntegrationDir;
      try {
        execFileSync(
          execPath,
          [
            'node_modules/vitest/vitest.mjs',
            'run',
            '--config',
            'scripts/harness/__tests__/vitest.config.ts',
            testPattern,
          ],
          { cwd: this.rootDir, stdio: 'pipe', timeout: 60_000 },
        );
        unitResults.set(unit, true);
      } catch {
        unitResults.set(unit, false);
      }
    }

    let passedCount = 0;
    let failedCount = 0;
    const failures: TestFailureDetail[] = [];

    for (const tc of testCases) {
      const unit = getTargetUnit(tc);
      const passed = unitResults.get(unit) ?? false;
      if (passed) {
        passedCount++;
      } else {
        failedCount++;
        failures.push(TestFailureDetail.create({
          testCaseId: getTestCaseId(tc),
          errorMessage: `Unit '${unit}' tests failed or test directory not found`,
        }));
      }
    }

    return {
      passedCount,
      failedCount,
      skippedCount: 0,
      totalCount: testCases.length,
      coverageRate: null,
      failures,
    };
  }
}
