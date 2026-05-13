/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 * @work-item-id WI-156
 */
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { FileSystemSkillCatalogDriftAdapter } from '../../../../validator-system/infrastructure/adapters/file-system-skill-catalog-drift-adapter.js';

async function createSkillCatalogFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'phasegate-skill-catalog-'));
  await mkdir(join(root, 'skills', 'alpha'), { recursive: true });
  await mkdir(join(root, 'skills', 'beta'), { recursive: true });
  await mkdir(join(root, 'docs', 'guide'), { recursive: true });
  await writeFile(join(root, 'skills', 'alpha', 'SKILL.md'), '# Alpha\n');
  await writeFile(join(root, 'skills', 'beta', 'SKILL.md'), '# Beta\n');
  await writeFile(join(root, 'skills', 'README.md'), '現在の配布対象は 2 skills です。\n');
  await writeFile(join(root, 'README.md'), '- [Skills Overview](docs/guide/skills-overview.md) -- 2 skills with AIDLC execution order\n');
  await writeFile(join(root, 'docs', 'guide', 'skills-overview.md'), [
    'Phasegate provides 2 skills covering the full AIDLC.',
    '',
    '### Foundation (1 skills)',
    '### Verification (1 skills)',
  ].join('\n'));
  return root;
}

target('FileSystemSkillCatalogDriftAdapter', () => {
  describe('collect', () => {
    context('skills overviewのカテゴリ見出しがある場合', () => {
      it('カテゴリ見出しを合計件数宣言ではなくカテゴリ宣言として収集すること', async () => {
        // Arrange
        const root = await createSkillCatalogFixture();

        // Act
        const actual = await new FileSystemSkillCatalogDriftAdapter(root).collect();

        // Assert
        expect(actual.actualSkillNames).toEqual(['alpha', 'beta']);
        expect(actual.countDeclarations.map((declaration) => declaration.declaredCount)).toEqual([2, 2, 2]);
        expect(actual.categoryDeclarations.map((declaration) => declaration.declaredCount)).toEqual([1, 1]);
      });
    });
  });
});
