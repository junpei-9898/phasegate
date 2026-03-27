/**
 * @layer application
 * @unit agent-integration
 */

export interface HandlePreToolUseInput {
  toolName: string;
  targetFilePaths: string[];
}

export interface HandlePreToolUseOutput {
  shouldBlock: boolean;
  blockedFilePath?: string;
  error?: { message: string };
  phaseGateBlockers?: string[];
}
