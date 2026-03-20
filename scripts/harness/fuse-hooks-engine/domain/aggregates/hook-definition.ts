/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import { randomUUID } from 'node:crypto';
import type { HookEventType } from '../types/hook-event-type.js';
import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { Result } from '../result.js';
import { HookAction } from '../value-objects/hook-action.js';
import { FilePattern } from '../value-objects/file-pattern.js';
import { HookType } from '../value-objects/hook-type.js';

export class HookDefinition {
  private constructor(
    readonly hookId: string,
    readonly hookType: HookType,
    readonly filePattern: FilePattern,
    readonly hookAction: HookAction,
    readonly description: string | null,
  ) {}

  static create(
    hookType: HookType,
    filePattern: FilePattern,
    hookAction: HookAction,
    description?: string,
  ) {
    if (hookType.value === 'pre-read' && hookAction.actionType === 'block-write') {
      return Result.err(
        new FuseHooksEngineDomainError(
          'HOOK_ACTION_TYPE_MISMATCH',
          'pre-read cannot use block-write',
        ),
      );
    }
    if (hookType.value === 'on-complete' && hookAction.actionType !== 'trigger-completion-check') {
      return Result.err(
        new FuseHooksEngineDomainError(
          'HOOK_ACTION_TYPE_MISMATCH',
          'on-complete must use trigger-completion-check',
        ),
      );
    }
    return Result.ok(
      new HookDefinition(randomUUID(), hookType, filePattern, hookAction, description ?? null),
    );
  }

  matches(filePath: string, eventType: HookEventType): boolean {
    return this.hookType.matchesEvent(eventType) && this.filePattern.test(filePath);
  }

  getAction(): HookAction {
    return this.hookAction;
  }
}
