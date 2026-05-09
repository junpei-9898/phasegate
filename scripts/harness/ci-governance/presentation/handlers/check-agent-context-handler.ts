/**
 * @layer presentation
 * @unit ci-governance
 */

import type { CheckAgentContextUseCase } from '../../application/usecases/check-agent-context-usecase.js';

export interface CheckAgentContextHandlerArgs {
  thresholdDays?: number;
  format?: 'human' | 'json';
}

export class CheckAgentContextHandler {
  constructor(private readonly useCase: CheckAgentContextUseCase) {}

  async handle(args: CheckAgentContextHandlerArgs): Promise<{ exitCode: number; output: string }> {
    const result = await this.useCase.execute({ thresholdDays: args.thresholdDays });

    if (args.format === 'json') {
      return { exitCode: result.passed ? 0 : 1, output: JSON.stringify(result, null, 2) };
    }

    const lines = [
      `Agent context freshness: ${result.passed ? 'PASS' : 'FAIL'}`,
      `Threshold: ${result.thresholdDays} days`,
      ...result.findings.map((finding) => {
        const age = finding.ageInDays === null ? 'missing' : `${finding.ageInDays} days`;
        return `- ${finding.path}: ${finding.status} (${age}) ${finding.message}`;
      }),
    ];
    return { exitCode: result.passed ? 0 : 1, output: lines.join('\n') };
  }
}
