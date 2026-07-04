// @layer test
import { expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { target, context } from '../../../helpers/test-helpers.js';
import { TypeScriptTestReferenceSourceAdapter } from '../../../../nyquist-validation/infrastructure/adapters/type-script-test-reference-source-adapter.js';

async function createTempTestFile(content: string): Promise<string> {
  const dirPath = join(tmpdir(), `nyquist-ts-ref-${randomUUID()}`);
  await mkdir(dirPath, { recursive: true });
  const filePath = join(dirPath, 'sample.test.ts');
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

target('TypeScriptTestReferenceSourceAdapter', () => {
  context('HF\\d+-XX 形式の @story タグが含まれる場合（回帰: 旧正規表現は取りこぼしていた）', () => {
    it('HF2-01 タグのテスト参照が抽出されること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story HF2-01',
          "it('phase2 拡張ストーリーを検証する', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].storyId).toBe('HF2-01');
      expect(actual[0].testName).toBe('phase2 拡張ストーリーを検証する');
    });

    it('@story-id HF2-04 タグのテスト参照が抽出されること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story-id HF2-04',
          "test('別 phase2 拡張ストーリーを検証する', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].storyId).toBe('HF2-04');
    });
  });

  context('通常の HXX-XX 形式の @story タグが含まれる場合', () => {
    it('H14-03 タグのテスト参照が引き続き抽出されること', async () => {
      // Arrange
      const filePath = await createTempTestFile(
        [
          '// @story H14-03',
          "it('通常ストーリーを検証する', () => {});",
        ].join('\n'),
      );
      const adapter = new TypeScriptTestReferenceSourceAdapter();

      // Act
      const actual = await adapter.readTestReferences(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].storyId).toBe('H14-03');
      expect(actual[0].testName).toBe('通常ストーリーを検証する');
    });
  });
});
