import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';

export interface ValidateHookYamlOutput {
  valid: boolean;
  errors: FuseHooksEngineDomainError[];
}
