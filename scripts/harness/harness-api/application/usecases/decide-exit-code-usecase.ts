// decide-exit-code-usecase.ts — DecideExitCodeUseCase

import type { ExitCodeDecisionInput } from '../dto/exit-code-decision-input.js';
import type { ExitCodeDecisionOutput } from '../dto/exit-code-decision-output.js';
import type { ExitCode } from '../../domain/value-objects/harness-api-response.js';

export class DecideExitCodeUseCase {
  execute(input: ExitCodeDecisionInput): ExitCodeDecisionOutput {
    const { status, commandName } = input;

    // D5ルール: harness:status は fail でも exitCode=0 を返す
    if (commandName === 'harness:status' && status === 'fail') {
      return {
        exitCode: 0 as ExitCode,
        reason: 'D5ルール適用: harness:statusコマンドはfailでもexitCode=0を返す（情報提供コマンドのため）',
      };
    }

    if (status === 'pass') {
      return { exitCode: 0 as ExitCode, reason: 'status=passのため exitCode=0' };
    }
    if (status === 'fail') {
      return { exitCode: 1 as ExitCode, reason: 'status=failのため exitCode=1' };
    }
    return { exitCode: 2 as ExitCode, reason: 'status=errorのため exitCode=2' };
  }
}
