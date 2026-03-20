/**
 * @layer presentation
 * @unit skill-quality
 */
import type { RunPlanCheckerLoopUseCase } from '../../application/usecases/run-plan-checker-loop-usecase.js';

export interface RunPlanCheckerLoopArgs {
  planFile: string;
  storyId: string;
}

export class RunPlanCheckerLoopHandler {
  constructor(private readonly useCase: RunPlanCheckerLoopUseCase) {}

  async handle(args: RunPlanCheckerLoopArgs): Promise<{ exitCode: number; message: string }> {
    try {
      const output = await this.useCase.execute({
        planDocument: args.planFile,
        storyId: args.storyId,
      });

      const historyLines = output.loopHistory.map(
        (a) => `  Attempt ${a.attemptNumber}: coverage=${a.coverageRate}%, gaps=${a.gaps.length}`
      ).join('\n');

      if (output.escalationRequired) {
        return { exitCode: 1, message: `Plan check FAILED_EXCEEDED - escalation required\n${historyLines}` };
      }
      return { exitCode: 0, message: `Plan check PASSED\n${historyLines}` };
    } catch (err) {
      return { exitCode: 2, message: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
