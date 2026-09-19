// @story H11-03
// @unit agent-integration
// @layer test
// @work-item-id WI-220
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { HarnessConfigConfigQueryAdapter } from '../../../agent-integration/infrastructure/adapters/harness-config-config-query-adapter.js';

describe('hook有効設定の旧環境互換', () => {
  const cases = [false, true, undefined].flatMap(legacy =>
    [false, true, undefined, 'invalid'].flatMap(explicit =>
      (['pre-tool-use', 'post-tool-use'] as const).map(hook => ({ legacy, explicit, hook }))));
  it.each(cases)('$hookの旧値$legacyと独立値$explicitから有効値を解決する', async ({ legacy, explicit, hook }) => {
    // Arrange
    const dir = await mkdtemp(join(tmpdir(), 'phasegate-hook-config-'));
    const file = join(dir, 'phasegate.config.json');
    await writeFile(file, JSON.stringify({
      harnesses: { agentLessonCollection: legacy, cascadeUpdate: legacy },
      agentIntegration: { [hook === 'pre-tool-use' ? 'preToolUse' : 'postToolUse']: { enabled: explicit } },
    }));
    const adapter = new HarnessConfigConfigQueryAdapter(file);
    try {
      // Act
      const actual = await adapter.isHookEnabled(hook);
      // Assert
      expect(actual).toBe(typeof explicit === 'boolean' ? explicit : legacy ?? true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
