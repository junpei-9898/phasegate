/**
 * @layer application
 * @unit agent-integration
 */

import type { SkipReason } from '../../domain/value-objects/hook-translation-result.js';

export interface HandlePostToolUseInput {
  toolName: string;
  affectedFilePaths: string[];
}

export interface CliExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface HandlePostToolUseOutput {
  executed: boolean;
  skipReason?: SkipReason;
  cliResult?: CliExecutionResult;
}
