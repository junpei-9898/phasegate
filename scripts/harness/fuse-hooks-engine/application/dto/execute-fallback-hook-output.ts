import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';
import { HookAction } from '../../domain/value-objects/hook-action.js';

export interface ExecuteFallbackHookOutput {
  action: HookAction | null;
  errors: FuseHooksEngineDomainError[];
}
