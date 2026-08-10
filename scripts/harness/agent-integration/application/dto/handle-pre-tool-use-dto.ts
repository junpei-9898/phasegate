/**
 * @layer application
 * @unit agent-integration
 */

/**
 * WI-376 (ADR-039): 呼び出し元 skill 名を受け取るフィールドは持たない。
 * 判定・案内の入力は hook が自ら観測・検証できる state（対象パス、変更カテゴリ、
 * session marker、設計文書の存在、解決済み config 等）に限る。
 */
export interface HandlePreToolUseInput {
  toolName: string;
  targetFilePaths: string[];
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
  fullModeRejectionRule?: 'CATEGORY_NOT_ALLOWED' | 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  fullModeDominantCategory?: string;
  nextAction?: string;
  // Quick Mode が write を許可した際に dominant カテゴリを presentation 層に伝える。
  // shouldBlock=false のときのみセットされる。WI-087 finding #3。
  quickModeAllowed?: {
    dominantCategory?: string;
  };
  fullModeSessionAllowed?: {
    workItemId?: string;
    unit?: string;
    expiresAt?: string;
  };
}
