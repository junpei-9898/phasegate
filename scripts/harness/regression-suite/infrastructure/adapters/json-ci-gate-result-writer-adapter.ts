// @layer infrastructure
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SuiteIdValue } from '../../domain/value-objects/suite-id.js';
import type { TestExecutionSummary } from '../../domain/value-objects/test-execution-summary.js';
import type { CiGateResultWriterPort } from '../../domain/ports/ci-gate-result-writer-port.js';

export class JsonCiGateResultWriterAdapter implements CiGateResultWriterPort {
  constructor(private readonly outputDir: string) {}

  async write(suiteId: SuiteIdValue, summary: TestExecutionSummary): Promise<void> {
    const result = {
      suiteId,
      passedCount: summary.passedCount,
      failedCount: summary.failedCount,
      skippedCount: summary.skippedCount,
      totalCount: summary.totalCount,
      coverageRate: summary.coverageRate?.value ?? null,
      failures: summary.failures.map((f) => ({
        testCaseId: f.testCaseId,
        errorMessage: f.errorMessage,
        stackTrace: f.stackTrace,
      })),
      timestamp: new Date().toISOString(),
    };

    await fs.mkdir(this.outputDir, { recursive: true });
    const filePath = path.join(this.outputDir, `${suiteId}-result.json`);
    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
  }
}
