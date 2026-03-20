/**
 * @layer application
 * @unit fuse-hooks-engine
 */

import type { FallbackHandlerPort } from '../../domain/ports/fallback-handler-port.js';
import type { ExecuteFallbackHookInput } from '../dto/execute-fallback-hook-input.js';
import type { ExecuteFallbackHookOutput } from '../dto/execute-fallback-hook-output.js';

export class ExecuteFallbackHookUseCase {
  constructor(private readonly fallbackHandlerPort: FallbackHandlerPort) {}

  async execute(input: ExecuteFallbackHookInput): Promise<ExecuteFallbackHookOutput> {
    const action = input.eventType === 'read'
      ? await this.fallbackHandlerPort.handlePreRead(input.filePath)
      : await this.fallbackHandlerPort.handlePreWrite(input.filePath);

    return {
      action,
      errors: [],
    };
  }
}
