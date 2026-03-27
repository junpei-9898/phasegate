/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import * as fs from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';
import { Result } from '../../domain/result.js';
import { HookYamlConfig } from '../../domain/value-objects/hook-yaml-config.js';

export class YamlHookConfigReaderAdapter {
  async read(yamlPath: string) {
    try {
      const raw = await fs.readFile(yamlPath, 'utf8');
      const parsed = parseYaml(raw) as unknown;
      const config = HookYamlConfig.create(parsed);
      return config.isErr() ? Result.err(config._unsafeUnwrapErr()) : Result.ok(config._unsafeUnwrap());
    } catch (error) {
      return Result.err([
        new FuseHooksEngineDomainError(
          'HOOK_YAML_PARSE_ERROR',
          error instanceof Error ? error.message : 'Failed to parse hook yaml',
        ),
      ]);
    }
  }
}
