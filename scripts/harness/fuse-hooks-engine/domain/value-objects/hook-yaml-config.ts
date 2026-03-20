/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import { HookDefinition } from '../aggregates/hook-definition.js';
import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { Result } from '../result.js';
import { HookAction } from './hook-action.js';
import { FilePattern } from './file-pattern.js';
import { HookType } from './hook-type.js';

interface RawHookEntry {
  type: string;
  files: {
    include: string[];
    exclude?: string[];
  };
  action: {
    type: string;
    config: Record<string, unknown>;
  };
  description?: string;
}

interface RawGateEntry {
  storyId: string;
  magicFilePath: string;
  requiredFields?: string[];
}

export class HookYamlConfig {
  private constructor(
    readonly version: number,
    readonly hooks: readonly RawHookEntry[],
    readonly protectedResources: readonly string[],
    readonly completionGates: readonly RawGateEntry[],
  ) {}

  static create(raw: unknown) {
    if (typeof raw !== 'object' || raw === null) {
      return Result.err([
        new FuseHooksEngineDomainError('HOOK_YAML_INVALID_ROOT', 'root must be object'),
      ]);
    }
    const candidate = raw as {
      version?: unknown;
      hooks?: unknown;
      protectedResources?: unknown;
      completionGates?: unknown;
    };
    if (typeof candidate.version !== 'number') {
      return Result.err([
        new FuseHooksEngineDomainError('HOOK_YAML_INVALID_VERSION', 'version must be number'),
      ]);
    }
    if (!Array.isArray(candidate.hooks)) {
      return Result.err([
        new FuseHooksEngineDomainError('HOOK_YAML_INVALID_HOOKS', 'hooks must be array'),
      ]);
    }
    return Result.ok(
      new HookYamlConfig(
        candidate.version,
        candidate.hooks as RawHookEntry[],
        Array.isArray(candidate.protectedResources) ? candidate.protectedResources as string[] : [],
        Array.isArray(candidate.completionGates) ? candidate.completionGates as RawGateEntry[] : [],
      ),
    );
  }

  toHookDefinitions() {
    const definitions: HookDefinition[] = [];
    const errors: FuseHooksEngineDomainError[] = [];

    for (const hook of this.hooks) {
      const hookType = HookType.create(hook.type);
      if (hookType.isErr()) {
        errors.push(hookType._unsafeUnwrapErr());
        continue;
      }

      const filePattern = FilePattern.create(hook.files.include, hook.files.exclude ?? []);
      if (filePattern.isErr()) {
        errors.push(filePattern._unsafeUnwrapErr());
        continue;
      }

      const hookAction = HookAction.create(hook.action.type, hook.action.config);
      if (hookAction.isErr()) {
        errors.push(hookAction._unsafeUnwrapErr());
        continue;
      }

      const definition = HookDefinition.create(
        hookType._unsafeUnwrap(),
        filePattern._unsafeUnwrap(),
        hookAction._unsafeUnwrap(),
        hook.description,
      );
      if (definition.isErr()) {
        errors.push(definition._unsafeUnwrapErr());
        continue;
      }

      definitions.push(definition._unsafeUnwrap());
    }

    return errors.length > 0 ? Result.err(errors) : Result.ok(definitions);
  }
}
