/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import type { ActionConfig } from '../types/action-config.js';
import type { ActionType } from '../types/action-type.js';
import { isActionType } from '../types/action-type.js';
import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { Result } from '../result.js';

export class HookAction {
  private constructor(
    readonly actionType: ActionType,
    readonly config: ActionConfig,
  ) {}

  static create(actionType: string, config: ActionConfig) {
    if (!isActionType(actionType)) {
      return Result.err(
        new FuseHooksEngineDomainError('HOOK_INVALID_ACTION_TYPE', `Invalid action type: ${actionType}`),
      );
    }
    return Result.ok(new HookAction(actionType, config));
  }

  equals(other: HookAction): boolean {
    return this.actionType === other.actionType && JSON.stringify(this.config) === JSON.stringify(other.config);
  }
}
