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
  blockReason?: 'PROTECTED_FILE' | 'PHASE_GATE' | 'STORY_REFLECTION' | 'FULL_MODE_REQUIRED';
  error?: { message: string };
  phaseGateBlockers?: string[];
  storyReflectionBlockers?: string[];
  storyReflectionWarnings?: string[];
  fullModeRejectionRule?: 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  fullModeDominantCategory?: string;
  nextAction?: string;
}
