/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import type { Result } from '../result.js';
import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { HookYamlConfig } from '../value-objects/hook-yaml-config.js';

export interface HookConfigReaderPort {
  read(yamlPath: string): Promise<Result<HookYamlConfig, FuseHooksEngineDomainError[]>>;
}
