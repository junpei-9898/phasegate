// @layer test
// @unit nyquist-validation
// @story HF2-05
// @work-item-id WI-222
import { expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { target, context } from '../../../helpers/test-helpers.js';
import { TypeScriptTestReferenceSourceAdapter } from '../../../../nyquist-validation/infrastructure/adapters/type-script-test-reference-source-adapter.js';

async function createTempTestFile(content: string): Promise<string> {
  const dirPath = join(tmpdir(), `nyquist-ts-ref-ac-${randomUUID()}`);
  await mkdir(dirPath, { recursive: true });
  const filePath = join(dirPath, 'sample.test.ts');
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

target('TypeScriptTestReferenceSourceAdapter — AC-level tracer', () => {
  context('絶対形式 @ac が付与された場合', () => {
    // @ac HF2-05-1
    it('絶対形式@acがacIdsに格納されること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story H05-02',
          '// @ac H05-02-1',
          "it('AC-1 を検証する', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].acIds).toEqual(['AC-1']);
    });
  });

  context('相対形式 @ac が付与された場合', () => {
    // @ac HF2-05-2
    it('単一storyのファイルで相対@acが解決されること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story H05-02',
          '// @ac AC-2',
          "it('AC-2 を検証する', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].acIds).toEqual(['AC-2']);
    });

    it('複数storyのファイルでは相対@acがorphanとして未解決になること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story H05-02',
          '// @story H06-03',
          '// @ac AC-2',
          "it('曖昧な相対 AC', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      // 複数 @story のため相対 AC-2 は解決できず acIds は空、orphan として報告される
      expect(actual.some((ref) => (ref.acIds ?? []).length > 0)).toBe(false);
      expect(actual.some((ref) => (ref.orphanAcTags ?? []).some((t) => t.rawTag === 'AC-2'))).toBe(true);
    });
  });

  context('1 つの it に複数 AC が付与された場合', () => {
    it('1itに複数ACが格納されること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story H05-02',
          '// @ac H05-02-1 H05-02-2',
          "it('AC-1 と AC-2 をまとめて検証する', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].acIds).toEqual(['AC-1', 'AC-2']);
    });
  });

  context('直前の it 以降の最近接 @ac のみを紐づける場合', () => {
    it('最近接@acのみが対象テストに紐づくこと', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story H05-02',
          '// @ac H05-02-1',
          "it('AC-1 のテスト', () => {});",
          '// @ac H05-02-2',
          "it('AC-2 のテスト', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      const ac1 = actual.find((r) => r.testName === 'AC-1 のテスト');
      const ac2 = actual.find((r) => r.testName === 'AC-2 のテスト');
      expect(ac1?.acIds).toEqual(['AC-1']);
      expect(ac2?.acIds).toEqual(['AC-2']);
    });
  });

  context('@ac が付与されていない場合（従来挙動）', () => {
    it('@ac無しは従来どおりacIdsが空になること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story H05-02',
          "it('注釈なしテスト', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].acIds ?? []).toEqual([]);
      expect(actual[0].storyId).toBe('H05-02');
      expect(actual[0].testName).toBe('注釈なしテスト');
    });
  });

  context('ファイルの story に属さない AC を @ac が指す場合', () => {
    it('story外AC指定がorphanAcTagsとして報告されること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story H05-02',
          '// @ac H99-99-1',
          "it('別 story の AC を誤指定', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].acIds ?? []).toEqual([]);
      expect(actual[0].orphanAcTags?.some((t) => t.rawTag === 'H99-99-1')).toBe(true);
    });
  });
});
