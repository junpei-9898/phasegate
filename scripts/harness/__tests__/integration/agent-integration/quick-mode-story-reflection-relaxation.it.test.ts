// @unit agent-integration
// @layer infrastructure
// @story A-7-6

/**
 * A-7-6: Quick Mode × storyReflection 緩和の統合テスト
 *
 * 計画書 §4.6 に基づき、Quick Mode 相当の設定（preset=minimal または
 * storyReflection.enabled=false）で実ファイルシステム上に storyReflection
 * 違反が存在する場合でも、FileSystemStoryReflectionQueryAdapter が
 * "skipped" を返して Hook をブロックしないことを検証する。
 *
 * 対照ケースとして preset=full では同じ FS 状態でブロックされることを
 * 確認し、緩和が有効に機能していることを保証する。
 */

import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { context, target } from '../../helpers/test-helpers.ts';
import { FileSystemStoryReflectionQueryAdapter } from '../../../agent-integration/infrastructure/adapters/file-system-story-reflection-query-adapter.js';

let rootDir: string;
let configPath: string;

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function seedStoryReflectionViolation(unitId: string, storyId: string): Promise<void> {
  // inception には storyId ディレクトリと logical_design.md を作成
  await mkdir(path.join(rootDir, `docs/inception/${unitId}/${storyId}`), { recursive: true });
  await writeFile(
    path.join(rootDir, `docs/inception/${unitId}/${storyId}/logical_design.md`),
    `# ${storyId} logical`,
  );
  await writeFile(
    path.join(rootDir, `docs/inception/${unitId}/${storyId}/domain_model.md`),
    `# ${storyId} domain`,
  );
  // product 側は @story-id アノテーションを故意に欠落させる
  await mkdir(path.join(rootDir, `docs/product/construction/${unitId}`), { recursive: true });
  await writeFile(
    path.join(rootDir, `docs/product/construction/${unitId}/logical_design.md`),
    '# no annotation',
  );
  await writeFile(
    path.join(rootDir, `docs/product/construction/${unitId}/domain_model.md`),
    '# no annotation',
  );
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'quick-sr-relax-it-'));
  configPath = path.join(rootDir, 'phasegate.config.json');
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

target('Quick Mode × storyReflection 緩和', () => {
  context('preset=minimal（Quick Mode 相当）で storyReflection 違反が存在する場合', () => {
    // IT-A7-6-001
    it('skipped=true を返し Hook をブロックしないこと', async () => {
      // Arrange
      await writeJson(configPath, {
        phaseDependencies: { preset: 'minimal' },
      });
      await seedStoryReflectionViolation('order', 'US-601');
      const adapter = new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath });

      // Act
      const actual = await adapter.checkReflection('order');

      // Assert
      expect(actual.skipped).toBe(true);
      expect(actual.passed).toBe(true);
      expect(actual.blockers).toEqual([]);
    });
  });

  context('preset=full で storyReflection.enabled=false が明示される場合', () => {
    // IT-A7-6-002
    it('skipped=true を返し緩和が適用されること', async () => {
      // Arrange
      await writeJson(configPath, {
        phaseDependencies: {
          preset: 'full',
          storyReflection: { enabled: false },
        },
      });
      await seedStoryReflectionViolation('order', 'US-602');
      const adapter = new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath });

      // Act
      const actual = await adapter.checkReflection('order');

      // Assert
      expect(actual.skipped).toBe(true);
      expect(actual.passed).toBe(true);
    });
  });

  context('対照: preset=full で同一 FS 状態の場合', () => {
    // IT-A7-6-003
    it('storyReflection が発火し blockers 付きでブロックされること（緩和が効いていないことの対照確認）', async () => {
      // Arrange
      await writeJson(configPath, {
        phaseDependencies: { preset: 'full' },
      });
      await seedStoryReflectionViolation('order', 'US-603');
      const adapter = new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath });

      // Act
      const actual = await adapter.checkReflection('order');

      // Assert
      expect(actual.skipped).toBe(false);
      expect(actual.passed).toBe(false);
      expect(actual.blockers.length).toBeGreaterThan(0);
      expect(actual.blockers.some((b) => b.includes('US-603'))).toBe(true);
    });
  });

  context('設定ファイルが存在しない場合', () => {
    // IT-A7-6-004
    it('fail-safe で skipped を返し Hook をブロックしないこと', async () => {
      // Arrange: configPath は未作成
      await seedStoryReflectionViolation('order', 'US-604');
      const adapter = new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath });

      // Act
      const actual = await adapter.checkReflection('order');

      // Assert
      expect(actual.skipped).toBe(true);
      expect(actual.passed).toBe(true);
    });
  });
});
