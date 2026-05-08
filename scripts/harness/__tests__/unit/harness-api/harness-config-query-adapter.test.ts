// @layer test
// @unit harness-api
// @story H09-04
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HarnessConfigQueryAdapter } from '../../../harness-api/infrastructure/adapters/harness-config-query-adapter.js';

async function writeConfig(config: unknown): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), 'phasegate-config-query-'));
  const configPath = join(workDir, 'phasegate.config.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

target('HarnessConfigQueryAdapter.getPresetInfo', () => {
  describe('layers overrideを含むプリセット情報取得', () => {
    context('strictプリセットでL4が明示的に無効化されている場合', () => {
      it('L4をenabledLayersから除外すること', async () => {
        // Arrange
        const configPath = await writeConfig({
          version: 2,
          project: { name: 'test-project', preset: 'strict' },
          layers: { L4: { enabled: false } },
        });
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getPresetInfo();

        // Assert
        expect(actual.name).toBe('strict');
        expect(actual.enabledLayers).toEqual(['L1', 'L2', 'L3']);
      });
    });

    context('minimalプリセットでL4が明示的に有効化されている場合', () => {
      it('L4をenabledLayersに追加すること', async () => {
        // Arrange
        const configPath = await writeConfig({
          version: 2,
          project: { name: 'test-project', preset: 'minimal' },
          layers: { L4: { enabled: true } },
        });
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getPresetInfo();

        // Assert
        expect(actual.name).toBe('minimal');
        expect(actual.enabledLayers).toEqual(['L1', 'L4']);
      });
    });
  });
});
