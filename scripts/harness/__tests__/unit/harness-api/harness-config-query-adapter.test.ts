// @layer test
// @unit harness-api
// @story H09-04
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

async function arrangeOperationalHealthFixture(): Promise<HarnessConfigQueryAdapter> {
  const workDir = await mkdtemp(join(tmpdir(), 'phasegate-operational-health-'));
  const configPath = join(workDir, 'phasegate.config.json');
  await mkdir(join(workDir, '.phasegate'), { recursive: true });
  const currentContent = 'current\n';
  const currentSha1 = createHash('sha1').update(currentContent).digest('hex');
  await writeFile(join(workDir, 'kept.ts'), currentContent);
  await writeFile(configPath, JSON.stringify({
    version: 2,
    project: { name: 'test-project', preset: 'standard' },
    baseline: { enabled: true, path: '.phasegate/baseline.json' },
  }));
  await writeFile(join(workDir, '.phasegate/baseline.json'), JSON.stringify({
    version: '1.0',
    createdAt: '2026-05-12T00:00:00.000Z',
    algorithm: 'sha1',
    files: [
      { path: 'kept.ts', sha1: currentSha1 },
      { path: 'missing.ts', sha1: '0000000000000000000000000000000000000000' },
    ],
  }));
  await writeFile(join(workDir, '.phasegate/hook-skip-events.jsonl'), `${JSON.stringify({
    hookType: 'stop',
    reason: 'REENTRY_DETECTED',
    targetPaths: [],
    observedAt: '2026-05-12T00:00:00.000Z',
  })}\n`);
  return new HarnessConfigQueryAdapter({ configPath });
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

target('HarnessConfigQueryAdapter operational health', () => {
  describe('baseline と hook skip の状態取得', () => {
    context('baseline snapshot と hook skip record が存在する場合', () => {
      it('baseline debt を返すこと', async () => {
        // @work-item-id WI-123
        // Arrange
        const adapter = await arrangeOperationalHealthFixture();

        // Act
        const actual = await adapter.getBaselineHealth();

        // Assert
        expect(actual.grandfatheredFileCount).toBe(2);
        expect(actual.missingFileCount).toBe(1);
      });

      it('最新 hook skip reason を返すこと', async () => {
        // @work-item-id WI-123
        // Arrange
        const adapter = await arrangeOperationalHealthFixture();

        // Act
        const actual = await adapter.getHookHealth();

        // Assert
        expect(actual.latestSkip?.reason).toBe('REENTRY_DETECTED');
        expect(actual.skipCountsByReason.REENTRY_DETECTED).toBe(1);
      });
    });
  });
});
