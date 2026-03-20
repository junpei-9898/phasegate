/**
 * @layer application
 * @unit agent-integration
 */

import type { SkipReason } from '../../domain/value-objects/hook-translation-result.js';
import type { CliExecutionResult } from './handle-post-tool-use-dto.js';

export interface HandleStopInput {
  sessionId: string;
}

export interface HandleStopOutput {
  executed: boolean;
  skipReason?: SkipReason;
  cliResult?: CliExecutionResult;
}
