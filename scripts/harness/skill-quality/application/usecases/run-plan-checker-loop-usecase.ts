/**
 * @layer application
 * @unit skill-quality
 */
import { PlanCheckerLoop } from '../../domain/aggregates/plan-checker-loop.js';
import { LoopAttempt } from '../../domain/value-objects/loop-attempt.js';
import type { PlanCheckExecutorPort } from '../../domain/ports/plan-check-executor-port.js';
import type { RunPlanCheckerLoopInput } from '../dto/run-plan-checker-loop-input.js';
import type { RunPlanCheckerLoopOutput } from '../dto/run-plan-checker-loop-output.js';

export class RunPlanCheckerLoopUseCase {
  constructor(
    private readonly planCheckExecutorPort: PlanCheckExecutorPort,
  ) {}

  async execute(input: RunPlanCheckerLoopInput): Promise<RunPlanCheckerLoopOutput> {
    const loop = PlanCheckerLoop.create();
    let attemptNumber = 1;

    while (loop.status === 'RUNNING') {
      const result = await this.planCheckExecutorPort.evaluate(input.planDocument, loop.loopHistory);
      const attempt = LoopAttempt.create({
        attemptNumber,
        coverageRate: result.coverageRate,
        gaps: result.gaps,
        revision: result.revision,
      });
      loop.addAttempt(attempt);
      attemptNumber++;
    }

    return {
      status: loop.status,
      loopHistory: loop.loopHistory,
      escalationRequired: loop.status === 'FAILED_EXCEEDED',
    };
  }
}
