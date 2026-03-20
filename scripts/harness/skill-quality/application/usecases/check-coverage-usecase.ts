/**
 * @layer application
 * @unit skill-quality
 */
import { CoverageReport } from '../../domain/value-objects/coverage-report.js';
import { RequirementCoverageResult } from '../../domain/value-objects/requirement-coverage-result.js';
import type { RequirementTestMatrixPort } from '../../domain/ports/requirement-test-matrix-port.js';
import type { CoverageRunnerPort } from '../../domain/ports/coverage-runner-port.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { CheckCoverageInput } from '../dto/check-coverage-input.js';
import type { CheckCoverageOutput } from '../dto/check-coverage-output.js';

export class CheckCoverageUseCase {
  constructor(
    private readonly requirementTestMatrixPort: RequirementTestMatrixPort,
    private readonly coverageRunnerPort: CoverageRunnerPort,
    private readonly configQueryPort: ConfigQueryPort,
  ) {}

  async execute(input: CheckCoverageInput): Promise<CheckCoverageOutput> {
    const threshold = await this.configQueryPort.getCoverageThreshold();
    const matrix = await this.requirementTestMatrixPort.read(input.storyId);
    const requirementCoverage = RequirementCoverageResult.create(
      matrix.total,
      matrix.covered,
      matrix.uncoveredIds,
    );
    const codeCoverage = await this.coverageRunnerPort.run(input.storyId);
    const coverageReport = CoverageReport.create(requirementCoverage, codeCoverage);
    const meetsThreshold = coverageReport.meetsThreshold(threshold.requirement, threshold.code);

    return {
      coverageReport,
      meetsThreshold,
      requirementThreshold: threshold.requirement,
      codeThreshold: threshold.code,
    };
  }
}
