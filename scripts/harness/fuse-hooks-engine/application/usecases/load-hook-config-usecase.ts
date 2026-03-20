/**
 * @layer application
 * @unit fuse-hooks-engine
 */

import type { HookConfigReaderPort } from '../../domain/ports/hook-config-reader-port.js';
import { HookEvaluationService } from '../../domain/services/hook-evaluation-service.js';
import type { LoadHookConfigInput } from '../dto/load-hook-config-input.js';
import type { LoadHookConfigOutput } from '../dto/load-hook-config-output.js';

export class LoadHookConfigUseCase {
  constructor(
    private readonly hookConfigReaderPort: HookConfigReaderPort,
    _hookEvaluationService: HookEvaluationService,
  ) {}

  async execute(input: LoadHookConfigInput): Promise<LoadHookConfigOutput> {
    const readResult = await this.hookConfigReaderPort.read(input.yamlPath);
    if (!readResult.isOk()) {
      return {
        definitions: [],
        protectedResources: [],
        errors: readResult._unsafeUnwrapErr(),
      };
    }

    const config = readResult._unsafeUnwrap();
    const definitionsResult = config.toHookDefinitions();
    if (definitionsResult.isErr()) {
      return {
        definitions: [],
        protectedResources: [...config.protectedResources],
        errors: definitionsResult._unsafeUnwrapErr(),
      };
    }

    return {
      definitions: definitionsResult._unsafeUnwrap(),
      protectedResources: [...config.protectedResources],
      errors: [],
    };
  }
}
