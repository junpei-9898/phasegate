/**
 * @layer presentation
 * @unit skill-quality
 */
import type { ExecuteTddCycleUseCase } from '../../application/usecases/execute-tdd-cycle-usecase.js';

export interface ExecuteTddCycleArgs {
  unit: string;
  storyId: string;
  description: string;
  phase: 'RED' | 'GREEN' | 'REFACTOR';
  passed: boolean;
}

export class ExecuteTddCycleHandler {
  constructor(private readonly useCase: ExecuteTddCycleUseCase) {}

  async handle(args: ExecuteTddCycleArgs): Promise<{ exitCode: number; message: string }> {
    try {
      const output = await this.useCase.execute({
        unit: args.unit,
        storyId: args.storyId,
        description: args.description,
        phase: args.phase,
        passed: args.passed,
      });

      if (output.ready) {
        return { exitCode: 0, message: `Commit successful: ${output.committedMessage}` };
      }
      const violationMessages = output.violations.map((v) => `  - [${v.ruleId}] ${v.message}`).join('\n');
      return { exitCode: 1, message: `Validation failed:\n${violationMessages}` };
    } catch (err) {
      return { exitCode: 2, message: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
