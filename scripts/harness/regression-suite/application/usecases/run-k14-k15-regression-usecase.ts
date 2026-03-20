import { SuiteId } from '../../domain/value-objects/suite-id.js';
import { TestExecutionSummary } from '../../domain/value-objects/test-execution-summary.js';
import type { SuiteRegistryPort } from '../../domain/ports/suite-registry-port.js';
import type { TestRunnerPort } from '../../domain/ports/test-runner-port.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { CiGateResultWriterPort } from '../../domain/ports/ci-gate-result-writer-port.js';
import { TestExecutionSummaryMapper } from '../mappers/test-execution-summary-mapper.js';
import type { RunRegressionSuiteInput } from '../dto/run-regression-suite-input.js';
import type { RunRegressionSuiteOutput } from '../dto/run-regression-suite-output.js';
import type { KRequirementTest } from '../../domain/value-objects/k-requirement-test.js';

export class RunK14K15RegressionUseCase {
  constructor(
    private readonly suiteRegistryPort: SuiteRegistryPort,
    private readonly testRunnerPort: TestRunnerPort,
    private readonly configQueryPort: ConfigQueryPort,
    private readonly ciGateResultWriterPort: CiGateResultWriterPort
  ) {}

  async execute(input: RunRegressionSuiteInput = {}): Promise<RunRegressionSuiteOutput> {
    const suiteId = SuiteId.create(input.suiteId ?? 'k-requirements');
    const definition = await this.suiteRegistryPort.getDefinition(suiteId);

    const kFilter = input.kNumberFilter ?? ['K14', 'K15'];
    let testCases = definition.testCases as KRequirementTest[];
    testCases = testCases.filter((tc) => kFilter.includes(tc.kNumber));

    const runResult = await this.testRunnerPort.runSuite(testCases);

    const threshold =
      input.coverageThreshold ?? (await this.configQueryPort.getCoverageThreshold());

    const summary = TestExecutionSummary.create({
      passedCount: runResult.passedCount,
      failedCount: runResult.failedCount,
      skippedCount: runResult.skippedCount,
      totalCount: runResult.totalCount,
      coverageRate: runResult.coverageRate,
      failures: runResult.failures,
    });

    await this.ciGateResultWriterPort.write(suiteId.value, summary);

    return TestExecutionSummaryMapper.toOutput(summary, threshold);
  }
}
