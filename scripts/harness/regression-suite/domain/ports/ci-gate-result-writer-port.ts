// @layer domain
import type { SuiteIdValue } from '../value-objects/suite-id.js';
import type { TestExecutionSummary } from '../value-objects/test-execution-summary.js';

export interface CiGateResultWriterPort {
  write(suiteId: SuiteIdValue, summary: TestExecutionSummary): Promise<void>;
}
