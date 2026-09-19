/**
 * @layer presentation
 * @unit skill-quality
 */
import type { RunPlanCheckerLoopUseCase } from '../../application/usecases/run-plan-checker-loop-usecase.js';
import type { FileSystemPort } from '../../domain/ports/file-system-port.js';

export interface RunPlanCheckerLoopArgs {
  planFile: string;
  storyId: string;
}

export class RunPlanCheckerLoopHandler {
  constructor(
    private readonly useCase: RunPlanCheckerLoopUseCase,
    private readonly planReader?: Pick<FileSystemPort, 'read'>,
  ) {}

  async handle(args: RunPlanCheckerLoopArgs): Promise<{ exitCode: number; message: string }> {
    try {
      const output = await this.useCase.execute({
        planDocument: this.planReader ? await this.planReader.read(args.planFile) : args.planFile,
        storyId: args.storyId,
      });

      const historyLines = output.loopHistory.map(
        (a) => `  Attempt ${a.attemptNumber}: coverage=${a.coverageRate}%, gaps=${a.gaps.length}`
      ).join('\n');

      if (output.escalationRequired) {
        const guidance = output.stopReason === 'UNCHANGED_INPUT'
          ? '\n同じ入力の再試行では改善しません。文書を修正するか判断を求めてください。'
          : '';
        return { exitCode: 1, message: `Plan check FAILED_EXCEEDED - escalation required\n${historyLines}${guidance}\nこの結果は設計の意味的承認ではありません。` };
      }
      return { exitCode: 0, message: `Plan check PASSED\n${historyLines}\nこの結果は設計の意味的承認ではありません。` };
    } catch (err) {
      return { exitCode: 2, message: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
