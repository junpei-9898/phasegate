// @unit agent-integration
// @layer infrastructure
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FileSystemStoryReflectionQueryAdapter } from '../../../agent-integration/infrastructure/adapters/file-system-story-reflection-query-adapter.js';

let rootDir: string;

async function writeConfig(configPath: string, config: unknown): Promise<void> {
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'sr-query-adapter-'));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

target('FileSystemStoryReflectionQueryAdapter#checkReflection', () => {
  context('storyReflection が無効（preset=minimal）の場合', () => {
    it('skipped を返す', async () => {
      // Arrange
      const configPath = path.join(rootDir, 'phasegate.config.json');
      await writeConfig(configPath, {
        phaseDependencies: { preset: 'minimal' },
      });
      const adapter = new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath });

      // Act
      const result = await adapter.checkReflection('order');

      // Assert
      expect(result.skipped).toBe(true);
      expect(result.passed).toBe(true);
    });
  });

  context('storyReflection が有効で inception と product がすべて整合する場合', () => {
    it('passed を返す', async () => {
      // Arrange
      const configPath = path.join(rootDir, 'phasegate.config.json');
      await writeConfig(configPath, {
        phaseDependencies: { preset: 'full' },
      });
      await mkdir(path.join(rootDir, 'docs/inception/order/US-001'), { recursive: true });
      await writeFile(
        path.join(rootDir, 'docs/inception/order/US-001/logical_design.md'),
        '# US-001 logical',
      );
      await writeFile(
        path.join(rootDir, 'docs/inception/order/US-001/domain_model.md'),
        '# US-001 domain',
      );
      await mkdir(path.join(rootDir, 'docs/product/construction/order'), { recursive: true });
      await writeFile(
        path.join(rootDir, 'docs/product/construction/order/logical_design.md'),
        '<!-- @story-id US-001 -->\n# logical',
      );
      await writeFile(
        path.join(rootDir, 'docs/product/construction/order/domain_model.md'),
        '<!-- @story-id US-001 -->\n# domain',
      );
      const adapter = new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath });

      // Act
      const result = await adapter.checkReflection('order');

      // Assert
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.blockers).toEqual([]);
    });
  });

  context('storyReflection が有効で product に @story-id が未反映の場合', () => {
    it('blockers を含む block 結果を返す', async () => {
      // Arrange
      const configPath = path.join(rootDir, 'phasegate.config.json');
      await writeConfig(configPath, {
        phaseDependencies: { preset: 'full' },
      });
      await mkdir(path.join(rootDir, 'docs/inception/order/US-002'), { recursive: true });
      await writeFile(
        path.join(rootDir, 'docs/inception/order/US-002/logical_design.md'),
        '# US-002 logical',
      );
      await writeFile(
        path.join(rootDir, 'docs/inception/order/US-002/domain_model.md'),
        '# US-002 domain',
      );
      await mkdir(path.join(rootDir, 'docs/product/construction/order'), { recursive: true });
      await writeFile(
        path.join(rootDir, 'docs/product/construction/order/logical_design.md'),
        '# no annotation',
      );
      await writeFile(
        path.join(rootDir, 'docs/product/construction/order/domain_model.md'),
        '# no annotation',
      );
      const adapter = new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath });

      // Act
      const result = await adapter.checkReflection('order');

      // Assert
      expect(result.passed).toBe(false);
      expect(result.skipped).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockers.some((b) => b.includes('US-002'))).toBe(true);
      expect(
        result.blockers.some((b) => b.includes('docs/product/construction/order/logical_design.md')),
      ).toBe(true);
    });
  });

  context('inception ディレクトリが存在しない場合', () => {
    it('passed を返す（skip 相当）', async () => {
      // Arrange
      const configPath = path.join(rootDir, 'phasegate.config.json');
      await writeConfig(configPath, {
        phaseDependencies: { preset: 'full' },
      });
      const adapter = new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath });

      // Act
      const result = await adapter.checkReflection('missing-unit');

      // Assert
      expect(result.passed).toBe(true);
      expect(result.blockers).toEqual([]);
    });
  });
});
