/**
 * @layer presentation
 * @unit skill-quality
 */
import type { CheckCoverageUseCase } from '../../application/usecases/check-coverage-usecase.js';

export interface CheckCoverageArgs {
  storyId: string;
  format?: 'human' | 'json';
}

export class CheckCoverageHandler {
  constructor(private readonly useCase: CheckCoverageUseCase) {}

  async handle(args: CheckCoverageArgs): Promise<{ exitCode: number; message: string }> {
    try {
      const output = await this.useCase.execute({ storyId: args.storyId });
      const format = args.format ?? 'human';

      if (format === 'json') {
        return { exitCode: output.meetsThreshold ? 0 : 1, message: JSON.stringify(output, null, 2) };
      }

      const reqRate = output.coverageReport.requirementCoverage.coverageRate.toFixed(1);
      const codeRate = output.coverageReport.codeCoverage.lineCoverage.toFixed(1);
      const msg = `Requirement coverage: ${reqRate}% (threshold: ${output.requirementThreshold}%)\nCode coverage: ${codeRate}% (threshold: ${output.codeThreshold}%)`;

      if (output.meetsThreshold) {
        return { exitCode: 0, message: `Coverage OK\n${msg}` };
      }
      return { exitCode: 1, message: `Coverage FAILED\n${msg}` };
    } catch (err) {
      return { exitCode: 2, message: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
