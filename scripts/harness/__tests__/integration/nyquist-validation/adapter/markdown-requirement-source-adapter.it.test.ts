// @layer test
import { expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { target, context } from '../../../helpers/test-helpers.js';
import { MarkdownRequirementSourceAdapter } from '../../../../nyquist-validation/infrastructure/adapters/markdown-requirement-source-adapter.js';

async function createTempFile(content: string): Promise<string> {
  const dirPath = join(tmpdir(), `nyquist-md-${randomUUID()}`);
  await mkdir(dirPath, { recursive: true });
  const filePath = join(dirPath, 'requirements.md');
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

target('MarkdownRequirementSourceAdapter', () => {
  context('HF\\d+-XX 形式の Story 見出しが含まれる場合（回帰: 旧正規表現は取りこぼしていた）', () => {
    it('HF2-01 見出しの AC が抽出されること', async () => {
      // Arrange
      const filePath = await createTempFile(
        [
          '### HF2-01: phase2 extension story',
          '- [ ] AC-1: something must hold',
          '- [x] AC-2: another thing',
        ].join('\n'),
      );
      const adapter = new MarkdownRequirementSourceAdapter();

      // Act
      const actual = await adapter.readRequirements(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].storyId).toBe('HF2-01');
      expect(actual[0].acIds).toEqual(['AC-1', 'AC-2']);
    });
  });

  context('通常の HXX-XX 形式の Story 見出しが含まれる場合', () => {
    it('H07-01 見出しの AC が引き続き抽出されること', async () => {
      // Arrange
      const filePath = await createTempFile(
        ['### H07-01: normal story', '- [ ] AC-1: criterion one'].join('\n'),
      );
      const adapter = new MarkdownRequirementSourceAdapter();

      // Act
      const actual = await adapter.readRequirements(filePath);

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].storyId).toBe('H07-01');
      expect(actual[0].acIds).toEqual(['AC-1']);
    });
  });
});
