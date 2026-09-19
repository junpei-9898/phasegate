// @layer presentation
// @unit agent-integration
// @work-item-id WI-123
// @work-item-id WI-220

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function recordHookSkipEvent(input: {
  readonly projectRoot: string;
  readonly hookType: string;
  readonly reason: string;
  readonly targetPaths: readonly string[];
}): Promise<void> {
  // Expected no-op states are not diagnostic events. Preserve existing history.
  if (input.reason === 'HOOK_DISABLED' || input.reason === 'READ_ONLY') return;
  try {
    const phasegateDir = path.join(input.projectRoot, '.phasegate');
    await fs.mkdir(phasegateDir, { recursive: true });
    const record = {
      hookType: input.hookType,
      reason: input.reason,
      targetPaths: [...input.targetPaths],
      observedAt: new Date().toISOString(),
    };
    await fs.appendFile(
      path.join(phasegateDir, 'hook-skip-events.jsonl'),
      `${JSON.stringify(record)}\n`,
      'utf-8',
    );
  } catch {
    // Hook skip recording is best-effort and must not change hook semantics.
  }
}
