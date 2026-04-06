// @layer application
import { SuiteId } from '../../domain/value-objects/suite-id.js';
import { TestExecutionSummary } from '../../domain/value-objects/test-execution-summary.js';
import { TestFailureDetail } from '../../domain/value-objects/test-failure-detail.js';
import { ImportGuardService } from '../../domain/services/import-guard-service.js';
import type { SuiteRegistryPort } from '../../domain/ports/suite-registry-port.js';
import type { ImportAnalyzerPort } from '../../domain/ports/import-analyzer-port.js';
import type { CiGateResultWriterPort } from '../../domain/ports/ci-gate-result-writer-port.js';
import { TestExecutionSummaryMapper } from '../mappers/test-execution-summary-mapper.js';
import type { RunRegressionSuiteInput } from '../dto/run-regression-suite-input.js';
import type { RunRegressionSuiteOutput } from '../dto/run-regression-suite-output.js';
import type { AgentIndependenceTest } from '../../domain/value-objects/agent-independence-test.js';

export class RunAgentIndependenceGuardUseCase {
  private readonly importGuardService: ImportGuardService;

  constructor(
    private readonly suiteRegistryPort: SuiteRegistryPort,
    importAnalyzerPort: ImportAnalyzerPort,
    private readonly ciGateResultWriterPort: CiGateResultWriterPort
  ) {
    this.importGuardService = new ImportGuardService(importAnalyzerPort);
  }

  async execute(input: RunRegressionSuiteInput = {}): Promise<RunRegressionSuiteOutput> {
    const suiteId = SuiteId.create(input.suiteId ?? 'agent-independence');
    const definition = await this.suiteRegistryPort.getDefinition(suiteId);

    const agentTests = definition.testCases as AgentIndependenceTest[];
    const allFailures: TestFailureDetail[] = [];

    for (const test of agentTests) {
      let violations;
      try {
        violations = await this.importGuardService.verify(test);
      } catch (err) {
        throw new Error(`ImportAnalysisPortError: ${err instanceof Error ? err.message : String(err)}`);
      }

      for (const v of violations) {
        allFailures.push(
          TestFailureDetail.create({
            testCaseId: test.targetModule,
            errorMessage: v.violationMessage,
          })
        );
      }
    }

    const failedCount = allFailures.length;
    const passedCount = failedCount === 0 ? agentTests.length : 0;
    const totalCount = agentTests.length;

    const summary = TestExecutionSummary.create({
      passedCount,
      failedCount,
      skippedCount: 0,
      totalCount,
      coverageRate: null,
      failures: allFailures,
    });

    await this.ciGateResultWriterPort.write(suiteId.value, summary);

    return TestExecutionSummaryMapper.toOutput(summary, 0);
  }
}
