/**
 * @layer application
 * @unit agent-integration
 */

export interface HandlePreToolUseInput {
  toolName: string;
  targetFilePaths: string[];
  callerSkill?: string;
  targetChanges?: {
    filePath: string;
    beforeContent?: string | null;
    afterContent?: string | null;
  }[];
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
  // Quick Mode が write を許可した際に dominant カテゴリを presentation 層に伝える。
  // shouldBlock=false のときのみセットされる。WI-087 finding #3。
  quickModeAllowed?: {
    dominantCategory?: string;
  };
}
