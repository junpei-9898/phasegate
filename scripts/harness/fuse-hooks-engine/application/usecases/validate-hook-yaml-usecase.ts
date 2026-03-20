/**
 * @layer application
 * @unit fuse-hooks-engine
 */

import type { HookConfigReaderPort } from '../../domain/ports/hook-config-reader-port.js';
import type { ValidateHookYamlInput } from '../dto/validate-hook-yaml-input.js';
import type { ValidateHookYamlOutput } from '../dto/validate-hook-yaml-output.js';

export class ValidateHookYamlUseCase {
  constructor(private readonly hookConfigReaderPort: HookConfigReaderPort) {}

  async execute(input: ValidateHookYamlInput): Promise<ValidateHookYamlOutput> {
    const result = await this.hookConfigReaderPort.read(input.yamlPath);
    return !result.isOk()
      ? { valid: false, errors: result._unsafeUnwrapErr() }
      : { valid: true, errors: [] };
  }
}
