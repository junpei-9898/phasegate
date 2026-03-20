import type { SuiteId } from '../value-objects/suite-id.js';
import { TestExecutionSummary } from '../value-objects/test-execution-summary.js';
import { TestFailureDetail } from '../value-objects/test-failure-detail.js';
import type { AgentIndependenceTest } from '../value-objects/agent-independence-test.js';
import type { SuiteRegistryPort } from '../ports/suite-registry-port.js';
import type { TestRunnerPort } from '../ports/test-runner-port.js';
import type { ConfigQueryPort } from '../ports/config-query-port.js';
import type { CiGateResultWriterPort } from '../ports/ci-gate-result-writer-port.js';
import type { ImportGuardService } from './import-guard-service.js';

export class RegressionRunner {
  constructor(
    private readonly suiteRegistryPort: SuiteRegistryPort,
    private readonly testRunnerPort: TestRunnerPort,
    private readonly importGuardService: ImportGuardService,
    private readonly configQueryPort: ConfigQueryPort,
    private readonly ciGateResultWriterPort: CiGateResultWriterPort
  ) {}

  async execute(suiteId: SuiteId, coverageThreshold?: number): Promise<TestExecutionSummary> {
    let definition;
    try {
      definition = await this.suiteRegistryPort.getDefinition(suiteId);
    } catch (err) {
      if (err instanceof Error && err.message.includes('SuiteDefinitionNotFoundError')) {
        throw err;
      }
      throw new Error(`SuiteDefinitionNotFoundError: ${err instanceof Error ? err.message : String(err)}`);
    }

    const threshold = coverageThreshold ?? (await this.configQueryPort.getCoverageThreshold());

    let summary: TestExecutionSummary;

    if (suiteId.value === 'agent-independence') {
      // Run import guard checks
      const agentTests = definition.testCases as AgentIndependenceTest[];
      const allViolations: Array<{ testCaseId: string; errorMessage: string }> = [];

      for (const test of agentTests) {
        try {
          const violations = await this.importGuardService.verify(test);
          for (const v of violations) {
            allViolations.push({
              testCaseId: test.targetModule,
              errorMessage: v.violationMessage,
            });
          }
        } catch (err) {
          throw new Error(`ImportAnalysisPortError: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const failedCount = allViolations.length;
      const passedCount = agentTests.length - (failedCount > 0 ? failedCount : 0);
      const totalCount = agentTests.length;

      summary = TestExecutionSummary.create({
        passedCount: failedCount > 0 ? 0 : passedCount,
        failedCount,
        skippedCount: 0,
        totalCount,
        coverageRate: null,
        failures: allViolations.map((v) =>
          TestFailureDetail.create({ testCaseId: v.testCaseId, errorMessage: v.errorMessage })
        ),
      });
    } else {
      let runResult;
      try {
        runResult = await this.testRunnerPort.runSuite(definition.testCases);
      } catch (err) {
        throw new Error(`TestRunnerPortError: ${err instanceof Error ? err.message : String(err)}`);
      }

      summary = TestExecutionSummary.create({
        passedCount: runResult.passedCount,
        failedCount: runResult.failedCount,
        skippedCount: runResult.skippedCount,
        totalCount: runResult.totalCount,
        coverageRate: runResult.coverageRate,
        failures: runResult.failures,
      });
    }

    await this.ciGateResultWriterPort.write(suiteId.value, summary);

    return summary;
  }
}
