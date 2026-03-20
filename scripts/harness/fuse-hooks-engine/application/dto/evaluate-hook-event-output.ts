import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';
import { HookAction } from '../../domain/value-objects/hook-action.js';

export interface EvaluateHookEventOutput {
  actions: HookAction[];
  blocked: boolean;
  errors: FuseHooksEngineDomainError[];
}
