// @unit phase-dependency-model
// @layer application
// @story A-7-3

/**
 * A-7-3: CheckStoryReflectionUseCase の IT テスト
 *
 * 実ファイルシステム上の inception / product 文書に対して
 * CheckStoryReflectionUseCase + StoryReflectionChecker +
 * FileSystemStoryReflectionAdapter を結合した E2E フローを検証する。
 *
 * 配置理由: ポートをモックせず、tmpdir 上に実ファイルを生成して
 *           FS アダプタ経由で動作する結合テスト。
 */

import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { context, target } from '../../helpers/test-helpers.ts';
import { CheckStoryReflectionUseCase } from '../../../phase-dependency-model/application/usecases/check-story-reflection-usecase.js';
import { StoryReflectionChecker } from '../../../phase-dependency-model/domain/services/story-reflection-checker.js';
import { FileSystemStoryReflectionAdapter } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js';
import { StoryReflectionConfig } from '../../../phase-dependency-model/domain/values/story-reflection-config.js';
import { StoryReflectionMapping } from '../../../phase-dependency-model/domain/values/story-reflection-mapping.js';

let rootDir: string;

const REQUIRED_LOGICAL = StoryReflectionMapping.create({
  inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
  product: 'docs/product/construction/{unit}/logical_design.md',
  required: true,
});

const REQUIRED_DOMAIN = StoryReflectionMapping.create({
  inception: 'docs/inception/{unit}/{storyId}/domain_model.md',
  product: 'docs/product/construction/{unit}/domain_model.md',
  required: true,
});

const OPTIONAL_UIUX = StoryReflectionMapping.create({
  inception: 'docs/inception/{unit}/{storyId}/uiux_design.md',
  product: 'docs/product/construction/{unit}/uiux_design.md',
  required: false,
});

async function touch(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

function buildUseCase(): CheckStoryReflectionUseCase {
  const adapter = new FileSystemStoryReflectionAdapter({ rootDir });
  const checker = new StoryReflectionChecker(adapter);
  return new CheckStoryReflectionUseCase({ checker });
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'check-sr-uc-it-'));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

target('CheckStoryReflectionUseCase IT (実 FS)', () => {
  context('inception に storyId ディレクトリがあり全 required mapping が product に反映済みの場合', () => {
    // IT-A7-3-001
    it('passed=true / violations 空 / warnings 空 を返すこと', async () => {
      // Arrange
      await touch(
        path.join(rootDir, 'docs/inception/order/US-101/logical_design.md'),
        '# US-101 logical',
      );
      await touch(
        path.join(rootDir, 'docs/inception/order/US-101/domain_model.md'),
        '# US-101 domain',
      );
      await touch(
        path.join(rootDir, 'docs/product/construction/order/logical_design.md'),
        '<!-- @story-id US-101 -->\n# logical',
      );
      await touch(
        path.join(rootDir, 'docs/product/construction/order/domain_model.md'),
        '<!-- @story-id US-101 -->\n# domain',
      );
      const useCase = buildUseCase();
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [REQUIRED_LOGICAL, REQUIRED_DOMAIN],
      });

      // Act
      const actual = await useCase.execute({ unitId: 'order', config });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(0);
    });
  });

  context('inception に storyId があり required mapping の product が未反映の場合', () => {
    // IT-A7-3-002
    it('passed=false / violations に該当 storyId を含み isBlocked()=true を返すこと', async () => {
      // Arrange
      await touch(
        path.join(rootDir, 'docs/inception/order/US-102/logical_design.md'),
        '# US-102',
      );
      await touch(
        path.join(rootDir, 'docs/product/construction/order/logical_design.md'),
        '# no annotation',
      );
      const useCase = buildUseCase();
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [REQUIRED_LOGICAL],
      });

      // Act
      const actual = await useCase.execute({ unitId: 'order', config });

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.isBlocked()).toBe(true);
      expect(actual.violations.some((v) => v.storyId === 'US-102')).toBe(true);
    });
  });

  context('optional mapping で product 未反映の場合', () => {
    // IT-A7-3-003
    it('warnings にのみ追加され passed=true を維持すること', async () => {
      // Arrange
      await touch(
        path.join(rootDir, 'docs/inception/order/US-103/uiux_design.md'),
        '# US-103 uiux',
      );
      await touch(
        path.join(rootDir, 'docs/product/construction/order/uiux_design.md'),
        '# no annotation',
      );
      const useCase = buildUseCase();
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [OPTIONAL_UIUX],
      });

      // Act
      const actual = await useCase.execute({ unitId: 'order', config });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings.some((w) => w.storyId === 'US-103')).toBe(true);
    });
  });

  context('inception 配下に storyId ディレクトリが存在しない場合', () => {
    // IT-A7-3-004
    it('チェックを全件スキップして passed=true を返すこと', async () => {
      // Arrange
      const useCase = buildUseCase();
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [REQUIRED_LOGICAL],
      });

      // Act
      const actual = await useCase.execute({ unitId: 'nonexistent', config });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(0);
    });
  });

  context('config.enabled=false の場合', () => {
    // IT-A7-3-005
    it('FS アクセスを行わず即座に passed=true を返すこと', async () => {
      // Arrange: inception に違反状態を作っておく（本来なら fail する状態）
      await touch(
        path.join(rootDir, 'docs/inception/order/US-104/logical_design.md'),
        '# US-104',
      );
      const useCase = buildUseCase();
      const config = StoryReflectionConfig.disabled();

      // Act
      const actual = await useCase.execute({ unitId: 'order', config });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
    });
  });

  context('複数 storyId × 複数 mapping の混在結果', () => {
    // IT-A7-3-006
    it('required 違反は violations、optional 違反は warnings に仕分けされること', async () => {
      // Arrange
      // US-201: required logical 反映済み、optional uiux 未反映
      await touch(
        path.join(rootDir, 'docs/inception/order/US-201/logical_design.md'),
        '# US-201 logical',
      );
      await touch(
        path.join(rootDir, 'docs/inception/order/US-201/uiux_design.md'),
        '# US-201 uiux',
      );
      // US-202: required logical 未反映
      await touch(
        path.join(rootDir, 'docs/inception/order/US-202/logical_design.md'),
        '# US-202 logical',
      );
      await touch(
        path.join(rootDir, 'docs/product/construction/order/logical_design.md'),
        '<!-- @story-id US-201 -->\n# logical',
      );
      await touch(
        path.join(rootDir, 'docs/product/construction/order/uiux_design.md'),
        '# no annotation',
      );
      const useCase = buildUseCase();
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [REQUIRED_LOGICAL, OPTIONAL_UIUX],
      });

      // Act
      const actual = await useCase.execute({ unitId: 'order', config });

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.violations.some((v) => v.storyId === 'US-202')).toBe(true);
      expect(actual.warnings.some((w) => w.storyId === 'US-201')).toBe(true);
    });
  });
});
