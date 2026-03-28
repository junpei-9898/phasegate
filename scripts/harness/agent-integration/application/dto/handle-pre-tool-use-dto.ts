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
  blockReason?: 'PROTECTED_FILE' | 'PHASE_GATE';
  error?: { message: string };
  phaseGateBlockers?: string[];
  nextAction?: string;
}
