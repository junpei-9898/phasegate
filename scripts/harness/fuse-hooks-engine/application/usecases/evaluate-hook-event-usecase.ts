/**
 * @layer application
 * @unit fuse-hooks-engine
 */

import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';
import type { FallbackHandlerPort } from '../../domain/ports/fallback-handler-port.js';
import type { ShellWrapperPort } from '../../domain/ports/shell-wrapper-port.js';
import { HookEvaluationService } from '../../domain/services/hook-evaluation-service.js';
import type { EvaluateHookEventInput } from '../dto/evaluate-hook-event-input.js';
import type { EvaluateHookEventOutput } from '../dto/evaluate-hook-event-output.js';

export class EvaluateHookEventUseCase {
  constructor(
    private readonly fallbackHandlerPort: FallbackHandlerPort,
    private readonly shellWrapperPort: ShellWrapperPort,
    private readonly hookEvaluationService: HookEvaluationService,
  ) {}

  async execute(input: EvaluateHookEventInput): Promise<EvaluateHookEventOutput> {
    if (input.mountStatus === 'fallback') {
      const action = input.eventType === 'read'
        ? await this.fallbackHandlerPort.handlePreRead(input.filePath)
        : await this.fallbackHandlerPort.handlePreWrite(input.filePath);
      return {
        actions: action ? [action] : [],
        blocked: action?.actionType === 'block-write',
        errors: [],
      };
    }

    if (input.mountStatus === 'error') {
      return {
        actions: [],
        blocked: false,
        errors: [new FuseHooksEngineDomainError('FUSE_MOUNT_ERROR', 'FUSE mount is in error state')],
      };
    }

    const actions = this.hookEvaluationService.evaluate(
      input.filePath,
      input.eventType,
      input.definitions,
    );
    const errors: FuseHooksEngineDomainError[] = [];

    for (const action of actions) {
      if (action.actionType === 'run-shell') {
        const config = action.config as { script: string; timeout?: number; failOnNonZero: boolean };
        try {
          await this.shellWrapperPort.execute(config.script, {
            timeout: config.timeout,
            failOnNonZero: config.failOnNonZero,
          });
        } catch (error) {
          errors.push(
            error instanceof FuseHooksEngineDomainError
              ? error
              : new FuseHooksEngineDomainError('SHELL_HOOK_FAILED', 'Shell hook execution failed'),
          );
        }
      }
    }

    return {
      actions,
      blocked: actions.some((action) => action.actionType === 'block-write'),
      errors,
    };
  }
}
