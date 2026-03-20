/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import { CompletionGate } from '../entities/completion-gate.js';

export interface CompletionGateCheckResult {
  passed: boolean;
  failureReason: string | null;
}

export interface CompletionGatePort {
  load(storyId: string): Promise<CompletionGate | null>;
  save(gate: CompletionGate): Promise<void>;
  evaluateMagicFile(gate: CompletionGate): Promise<CompletionGateCheckResult>;
}
