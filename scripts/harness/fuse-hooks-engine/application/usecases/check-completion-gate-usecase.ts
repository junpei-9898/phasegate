/**
 * @layer application
 * @unit fuse-hooks-engine
 */

import type { CompletionGatePort } from '../../domain/ports/completion-gate-port.js';
import { CompletionGate } from '../../domain/entities/completion-gate.js';
import { MagicFile } from '../../domain/value-objects/magic-file.js';
import type { CheckCompletionGateInput } from '../dto/check-completion-gate-input.js';
import type { CheckCompletionGateOutput } from '../dto/check-completion-gate-output.js';

export class CheckCompletionGateUseCase {
  constructor(private readonly completionGatePort: CompletionGatePort) {}

  async execute(input: CheckCompletionGateInput): Promise<CheckCompletionGateOutput> {
    const magicFile = MagicFile.create(input.magicFilePath, input.requiredFields ?? []);
    if (magicFile.isErr()) {
      return {
        gateStatus: 'failed',
        checkedAt: null,
        failureReason: magicFile._unsafeUnwrapErr().message,
        errors: [magicFile._unsafeUnwrapErr()],
      };
    }

    const gate = await this.completionGatePort.load(input.storyId)
      ?? CompletionGate.create(input.storyId, magicFile._unsafeUnwrap());

    if (!gate.canRecheck()) {
      return {
        gateStatus: gate.status,
        checkedAt: gate.checkedAt,
        failureReason: gate.failureReason,
        errors: [],
      };
    }

    gate.startCheck();
    const checkResult = await this.completionGatePort.evaluateMagicFile(gate);
    if (checkResult.passed) {
      gate.passed();
    } else {
      gate.fail(checkResult.failureReason ?? 'Magic file check failed');
    }
    await this.completionGatePort.save(gate);

    return {
      gateStatus: gate.status,
      checkedAt: gate.checkedAt,
      failureReason: gate.failureReason,
      errors: [],
    };
  }
}
