// @layer test
// @unit nyquist-validation
// @work-item-id WI-292
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
      expect(actual[0].coverageStatus).toBe('required');
      expect(actual[0].coverageLifecycle).toEqual(['required']);
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
      expect(actual[0].coverageStatus).toBe('required');
      expect(actual[0].coverageLifecycle).toEqual(['required']);
    });
  });

  context('Story に coverage lifecycle が明示される場合', () => {
    it('planned と planned から required への順方向遷移を抽出すること', async () => {
      // Arrange
      const filePath = await createTempFile(
        [
          '### H17-07: planned story',
          '**Coverage status**: planned',
          '**Coverage lifecycle**: planned',
          '- [ ] AC-1: planned criterion',
          '### H17-06: required story',
          '**Coverage status**: required',
          '**Coverage lifecycle**: planned -> required',
          '- [x] AC-1: implemented criterion',
        ].join('\n'),
      );
      const adapter = new MarkdownRequirementSourceAdapter();

      // Act
      const actual = await adapter.readRequirements(filePath);

      // Assert
      expect(actual).toEqual([
        {
          storyId: 'H17-07',
          acIds: ['AC-1'],
          coverageStatus: 'planned',
          coverageLifecycle: ['planned'],
        },
        {
          storyId: 'H17-06',
          acIds: ['AC-1'],
          coverageStatus: 'required',
          coverageLifecycle: ['planned', 'required'],
        },
      ]);
    });

    it('required から planned への逆戻りを fail-closed で拒否すること', async () => {
      // Arrange
      const filePath = await createTempFile(
        [
          '### H17-07: invalid story',
          '**Coverage status**: planned',
          '**Coverage lifecycle**: required -> planned',
          '- [ ] AC-1: criterion',
        ].join('\n'),
      );
      const adapter = new MarkdownRequirementSourceAdapter();

      // Act / Assert
      await expect(adapter.readRequirements(filePath)).rejects.toThrow(/coverage lifecycle/i);
    });

    it('status と lifecycle の終端が一致しない宣言を fail-closed で拒否すること', async () => {
      // Arrange
      const filePath = await createTempFile(
        [
          '### H17-07: invalid story',
          '**Coverage status**: planned',
          '**Coverage lifecycle**: planned -> required',
          '- [ ] AC-1: criterion',
        ].join('\n'),
      );
      const adapter = new MarkdownRequirementSourceAdapter();

      // Act / Assert
      await expect(adapter.readRequirements(filePath)).rejects.toThrow(/coverage lifecycle/i);
    });

    it('coverage metadata の重複宣言を fail-closed で拒否すること', async () => {
      // Arrange
      const filePath = await createTempFile(
        [
          '### H17-07: invalid story',
          '**Coverage status**: planned',
          '**Coverage status**: required',
          '- [ ] AC-1: criterion',
        ].join('\n'),
      );
      const adapter = new MarkdownRequirementSourceAdapter();

      // Act / Assert
      await expect(adapter.readRequirements(filePath)).rejects.toThrow(/duplicate status/i);
    });
  });
});
