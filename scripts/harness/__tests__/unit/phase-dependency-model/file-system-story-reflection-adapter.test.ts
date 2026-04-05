// @unit phase-dependency-model
// @layer infrastructure
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FileSystemStoryReflectionAdapter } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js';

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'story-reflection-adapter-'));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

target('FileSystemStoryReflectionAdapter#listStoryDirectories', () => {
  context('inception/{unit}/ 配下に storyId ディレクトリが複数ある場合', () => {
    it('ディレクトリ名一覧を返す', async () => {
      // Arrange
      await mkdir(path.join(rootDir, 'docs/inception/order/US-001'), { recursive: true });
      await mkdir(path.join(rootDir, 'docs/inception/order/US-002'), { recursive: true });
      await writeFile(path.join(rootDir, 'docs/inception/order/README.md'), '# ignore');
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories('order');

      // Assert
      expect([...result].sort()).toEqual(['US-001', 'US-002']);
    });
  });

  context('inception/{unit}/ が存在しない場合', () => {
    it('空配列を返す', async () => {
      // Arrange
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories('missing');

      // Assert
      expect(result).toEqual([]);
    });
  });

  context('_shared ディレクトリは除外する', () => {
    it('_shared / _* / . で始まるディレクトリは含まない', async () => {
      // Arrange
      await mkdir(path.join(rootDir, 'docs/inception/order/_shared'), { recursive: true });
      await mkdir(path.join(rootDir, 'docs/inception/order/.cache'), { recursive: true });
      await mkdir(path.join(rootDir, 'docs/inception/order/US-001'), { recursive: true });
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories('order');

      // Assert
      expect([...result]).toEqual(['US-001']);
    });
  });
});

target('FileSystemStoryReflectionAdapter#fileExists', () => {
  it('ファイルが存在すれば true', async () => {
    // Arrange
    await mkdir(path.join(rootDir, 'docs/inception/order/US-001'), { recursive: true });
    await writeFile(
      path.join(rootDir, 'docs/inception/order/US-001/logical_design.md'),
      '# test',
    );
    const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

    // Act
    const actual = await adapter.fileExists(
      'docs/inception/order/US-001/logical_design.md',
    );

    // Assert
    expect(actual).toBe(true);
  });

  it('ファイルが存在しなければ false', async () => {
    // Arrange
    const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

    // Act
    const actual = await adapter.fileExists('docs/inception/order/US-001/missing.md');

    // Assert
    expect(actual).toBe(false);
  });
});

target('FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation', () => {
  context('product 文書内に @story-id アノテーションが存在する場合', () => {
    it('true を返す', async () => {
      // Arrange
      await mkdir(path.join(rootDir, 'docs/product/construction/order'), { recursive: true });
      await writeFile(
        path.join(rootDir, 'docs/product/construction/order/logical_design.md'),
        '# Order\n\n<!-- @story-id US-001 -->\n本文...',
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        'docs/product/construction/order/logical_design.md',
        'US-001',
      );

      // Assert
      expect(actual).toBe(true);
    });
  });

  context('別の storyId のみがある場合', () => {
    it('false を返す', async () => {
      // Arrange
      await mkdir(path.join(rootDir, 'docs/product/construction/order'), { recursive: true });
      await writeFile(
        path.join(rootDir, 'docs/product/construction/order/logical_design.md'),
        '<!-- @story-id US-002 -->',
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        'docs/product/construction/order/logical_design.md',
        'US-001',
      );

      // Assert
      expect(actual).toBe(false);
    });
  });

  context('product 文書が存在しない場合', () => {
    it('false を返す', async () => {
      // Arrange
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        'docs/product/construction/order/missing.md',
        'US-001',
      );

      // Assert
      expect(actual).toBe(false);
    });
  });

  context('@story-id の後ろに複数 ID がカンマ区切りで並ぶ場合', () => {
    it('該当 ID を検出できる', async () => {
      // Arrange
      await mkdir(path.join(rootDir, 'docs/product/construction/order'), { recursive: true });
      await writeFile(
        path.join(rootDir, 'docs/product/construction/order/logical_design.md'),
        '@story-id US-001, US-002, US-003',
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const a = await adapter.fileContainsStoryAnnotation(
        'docs/product/construction/order/logical_design.md',
        'US-002',
      );
      const b = await adapter.fileContainsStoryAnnotation(
        'docs/product/construction/order/logical_design.md',
        'US-999',
      );

      // Assert
      expect(a).toBe(true);
      expect(b).toBe(false);
    });
  });
});
