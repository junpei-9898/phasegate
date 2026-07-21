/**
 * @layer presentation
 * @unit ci-governance
 *
 * CheckRepetitionHandler - CLIハンドラー
 */

import type { CheckEscalationUseCase } from '../../application/usecases/check-escalation-usecase.js';
import type { ResetRepetitionUseCase } from '../../application/usecases/reset-repetition-usecase.js';

export interface CheckRepetitionHandlerArgs {
  errorCode: string;
  reset?: boolean;
  format?: 'human' | 'json';
}

export interface CheckRepetitionHandlerResult {
  exitCode: number;
  output: string;
  errors?: Array<{ code: string; message: string }>;
}

export class CheckRepetitionHandler {
  constructor(
    private readonly checkUseCase: CheckEscalationUseCase,
    private readonly resetUseCase?: ResetRepetitionUseCase,
  ) {}

  async handle(args: CheckRepetitionHandlerArgs): Promise<CheckRepetitionHandlerResult> {
    const { errorCode, reset = false, format = 'human' } = args;

    if (errorCode.trim().length === 0) {
      return {
        exitCode: 1,
        output: 'Error: --code <errorCode> is required. Usage: phasegate ci:check-repetition --code <errorCode> [--reset] [--json]',
      };
    }

    if (reset && this.resetUseCase) {
      const result = await this.resetUseCase.execute({ errorCode, confirmedResolution: true });

      if (format === 'json') {
        return { exitCode: result.success ? 0 : 1, output: JSON.stringify(result, null, 2), errors: result.errors };
      }

      const lines: string[] = [];
      if (result.success) {
        lines.push(`✓ Repetition record for ${errorCode} has been reset`);
      } else {
        lines.push(`❌ Reset failed for ${errorCode}`);
        for (const err of result.errors) {
          lines.push(`  [${err.code}] ${err.message}`);
        }
      }
      return { exitCode: result.success ? 0 : 1, output: lines.join('\n'), errors: result.errors };
    }

    const result = await this.checkUseCase.execute({ errorCode });
    const exitCode = result.escalated === true ? 1 : 0;

    if (format === 'json') {
      return { exitCode, output: JSON.stringify(result, null, 2) };
    }

    const lines: string[] = [];
    if (!result.exists) {
      lines.push(`No repetition record for errorCode: ${errorCode}`);
    } else {
      lines.push(`Error: ${errorCode}`);
      lines.push(`  Count: ${result.currentCount}`);
      lines.push(`  Escalated: ${result.escalated}`);
    }

    return { exitCode, output: lines.join('\n') };
  }
}
