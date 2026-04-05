// @unit traceability-model
// @layer application
// @story A-7-11

/**
 * A-7-11: Phase Gate × 複数 unit の統合テスト
 *
 * 計画書 §4.8 に基づき、ソースファイルの `@unit a, b`（カンマ区切り）が
 *   1. SourceMetadataParser で複数タグに展開され
 *   2. MetadataValidator が全 @unit を検証し
 *   3. ValidateImplementationMetadataUseCase 経由で
 *      「全 unit 有効 → valid=true」「一部 unit 未登録 → valid=false」
 * となることを、実ファイル + 実 Parser + 実 Validator で結合検証する。
 *
 * これは Phase Gate が複数 unit に対して「全 unit 通過 / 一部未通過でブロック」
 * の動作をとることを保証する L2 メタデータゲート層の統合テストである。
 */

import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { context, target } from '../../helpers/test-helpers.ts';
import { FileSystemMetadataReader } from '../../../traceability-model/infrastructure/gateways/file-system-metadata-reader.js';
import { MetadataValidator } from '../../../traceability-model/domain/services/metadata-validator.js';
import { ValidateImplementationMetadataUseCase } from '../../../traceability-model/application/usecases/validate-implementation-metadata-usecase.js';
import { ProjectRelativePath } from '../../../traceability-model/domain/value-objects/project-relative-path.js';
import type { UnitDefinitionPort } from '../../../traceability-model/domain/ports/unit-definition-port.js';
import type { StoryCatalogPort } from '../../../traceability-model/domain/ports/story-catalog-port.js';

let rootDir: string;

/**
 * テスト用 UnitDefinitionPort スタブ（ポート＝境界のため mock 禁止対象外）。
 * 登録済みユニット集合を静的に保持する。
 */
class FixedUnitDefinitionPort implements UnitDefinitionPort {
  constructor(private readonly knownUnits: ReadonlySet<string>) {}

  async exists(unitName: string): Promise<boolean> {
    return this.knownUnits.has(unitName);
  }

  async hasUnit(unitName: string): Promise<boolean> {
    return this.exists(unitName);
  }

  async getAllUnitNames(): Promise<readonly string[]> {
    return Object.freeze([...this.knownUnits]);
  }

  async findConstructionRoot(): Promise<null> {
    return null;
  }

  async resolveConstructionRoot(): Promise<null> {
    return null;
  }
}

/**
 * 本テストは @unit/@layer の検証に集中するため、StoryCatalog は空実装でよい。
 */
const emptyStoryCatalogPort: StoryCatalogPort = {
  async exists() {
    return true;
  },
  async hasStoryId() {
    return true;
  },
};

async function writeSource(relativePath: string, content: string): Promise<void> {
  const abs = path.join(rootDir, relativePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
}

function buildUseCase(knownUnits: readonly string[]): ValidateImplementationMetadataUseCase {
  const reader = new FileSystemMetadataReader({ rootDir });
  const validator = new MetadataValidator({
    storyCatalogPort: emptyStoryCatalogPort,
    unitDefinitionPort: new FixedUnitDefinitionPort(new Set(knownUnits)),
  });
  return new ValidateImplementationMetadataUseCase({
    metadataReaderPort: reader,
    validator,
  });
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'multi-unit-meta-it-'));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

target('複数 unit メタデータ検証 IT', () => {
  context('カンマ区切り `@unit a, b` で全 unit が登録済みの場合', () => {
    // IT-A7-11-001
    it('valid=true で全 unit のゲートを通過すること', async () => {
      // Arrange
      const filePath = 'scripts/harness/shared/infra.ts';
      await writeSource(
        filePath,
        [
          '// @unit order, payment',
          '// @layer infrastructure',
          '',
          'export const x = 1;',
          '',
        ].join('\n'),
      );
      const useCase = buildUseCase(['order', 'payment']);

      // Act
      const results = await useCase.execute([ProjectRelativePath.create(filePath)]);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(true);
      expect(results[0].errors).toEqual([]);
    });
  });

  context('カンマ区切り `@unit a, b` のうち 1 件が unit 定義に存在しない場合', () => {
    // IT-A7-11-002
    it('valid=false となり未登録 unit 名を含むエラーが返ること（一部未通過でブロック）', async () => {
      // Arrange
      const filePath = 'scripts/harness/shared/infra.ts';
      await writeSource(
        filePath,
        [
          '// @unit order, unknown-unit',
          '// @layer infrastructure',
          '',
          'export const x = 1;',
          '',
        ].join('\n'),
      );
      const useCase = buildUseCase(['order', 'payment']);

      // Act
      const results = await useCase.execute([ProjectRelativePath.create(filePath)]);

      // Assert
      expect(results[0].valid).toBe(false);
      const messages = results[0].errors.map((e) => e.message);
      expect(messages.some((m) => m.includes('unknown-unit'))).toBe(true);
      // order は有効なのでエラーに含まれない
      expect(messages.some((m) => m.includes('"order"'))).toBe(false);
    });
  });

  context('複数行 `@unit` が複数登録されており全件有効な場合', () => {
    // IT-A7-11-003
    it('valid=true として受理されること', async () => {
      // Arrange
      const filePath = 'scripts/harness/shared/bridge.ts';
      await writeSource(
        filePath,
        [
          '/**',
          ' * @unit order',
          ' * @unit payment',
          ' * @layer domain',
          ' */',
          'export const y = 2;',
        ].join('\n'),
      );
      const useCase = buildUseCase(['order', 'payment']);

      // Act
      const results = await useCase.execute([ProjectRelativePath.create(filePath)]);

      // Assert
      expect(results[0].valid).toBe(true);
    });
  });

  context('複数行 `@unit` のうち 2 件目が未登録の場合', () => {
    // IT-A7-11-004
    it('該当 unit のエラーのみが報告されブロックされること', async () => {
      // Arrange
      const filePath = 'scripts/harness/shared/bridge.ts';
      await writeSource(
        filePath,
        [
          '/**',
          ' * @unit order',
          ' * @unit legacy-ghost',
          ' * @layer domain',
          ' */',
          'export const y = 2;',
        ].join('\n'),
      );
      const useCase = buildUseCase(['order', 'payment']);

      // Act
      const results = await useCase.execute([ProjectRelativePath.create(filePath)]);

      // Assert
      expect(results[0].valid).toBe(false);
      const messages = results[0].errors.map((e) => e.message);
      expect(messages.some((m) => m.includes('legacy-ghost'))).toBe(true);
    });
  });

  context('カンマ区切りと複数行が混在しすべて有効な場合', () => {
    // IT-A7-11-005
    it('全 unit が展開されて valid=true になること', async () => {
      // Arrange
      const filePath = 'scripts/harness/shared/mixed.ts';
      await writeSource(
        filePath,
        [
          '// @unit order, payment',
          '// @unit shared-infra',
          '// @layer infrastructure',
          'export const z = 3;',
        ].join('\n'),
      );
      const useCase = buildUseCase(['order', 'payment', 'shared-infra']);

      // Act
      const results = await useCase.execute([ProjectRelativePath.create(filePath)]);

      // Assert
      expect(results[0].valid).toBe(true);
      expect(results[0].errors).toEqual([]);
    });
  });

  context('単一 `@unit`（後方互換）の場合', () => {
    // IT-A7-11-006
    it('従来通り 1 unit のみ検証されて valid=true になること', async () => {
      // Arrange
      const filePath = 'scripts/harness/order/entity.ts';
      await writeSource(
        filePath,
        [
          '// @unit order',
          '// @layer domain',
          'export const e = 4;',
        ].join('\n'),
      );
      const useCase = buildUseCase(['order']);

      // Act
      const results = await useCase.execute([ProjectRelativePath.create(filePath)]);

      // Assert
      expect(results[0].valid).toBe(true);
    });
  });
});
