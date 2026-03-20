import { HookDefinition } from '../../domain/aggregates/hook-definition.js';
import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';

export interface LoadHookConfigOutput {
  definitions: HookDefinition[];
  protectedResources: string[];
  errors: FuseHooksEngineDomainError[];
}
