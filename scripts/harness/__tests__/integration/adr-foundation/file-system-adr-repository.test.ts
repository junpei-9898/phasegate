import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ADR } from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';
import { AdrId } from '../../../adr-foundation/domain/value-objects/adr-id.js';
import { AdrStatus } from '../../../adr-foundation/domain/value-objects/adr-status.js';
import { AdrMarkdownDocumentParser } from '../../../adr-foundation/infrastructure/parsers/adr-markdown-document-parser.js';
import { RegexAdrFrontmatterParser } from '../../../adr-foundation/infrastructure/parsers/regex-adr-frontmatter-parser.js';
import { FileSystemAdrRepository } from '../../../adr-foundation/infrastructure/repositories/file-system-adr-repository.js';

const createAdr = (
  overrides?: Partial<{
    adrId: string;
    title: string;
    status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
    supersededBy: string;
  }>,
): ADR =>
  ADR.create(
    {
      adr_id: overrides?.adrId ?? '001',
      title: overrides?.title ?? 'Package separation',
      status: overrides?.status ?? 'Accepted',
      date: '2026-03-13',
      superseded_by: overrides?.supersededBy,
    },
    {
      context: 'Context',
      decision: 'Decision',
      consequences: 'Consequences',
      alternatives: 'Alternatives',
    },
    new AdrValidationService(),
  );

const withRepository = async (
  run: (input: { rootDir: string; repository: FileSystemAdrRepository }) => Promise<void>,
): Promise<void> => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-foundation-'));
  const documentParser = new AdrMarkdownDocumentParser(new RegexAdrFrontmatterParser());
  const repository = new FileSystemAdrRepository(rootDir, documentParser);

  try {
    await run({ rootDir, repository });
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
};

target('FileSystemAdrRepository', () => {
  describe('findById/findByRef/exists', () => {
    context('保存済みADRを取得する場合', () => {
      it('ID参照とADR参照の両方で同一ADRを解決できる', async () => {
        await withRepository(async ({ repository }) => {
          // Arrange
          const adr = createAdr();
          await repository.save(adr);

          // Act
          const actual = {
            byId: await repository.findById(AdrId.create('001')),
            byRef: await repository.findByRef('ADR-001'),
            byNumericRef: await repository.findByRef('001'),
            exists: await repository.exists(AdrId.create('001')),
          };

          // Assert
          expect(actual.byId?.toAdrRef()).toBe('ADR-001');
          expect(actual.byRef?.toAdrRef()).toBe('ADR-001');
          expect(actual.byNumericRef?.toAdrRef()).toBe('ADR-001');
          expect(actual.exists).toBe(true);
        });
      });
    });
  });

  describe('findAll', () => {
    context('template.mdと複数ステータスのADRが存在する場合', () => {
      it('templateを除外しstatus条件で絞り込める', async () => {
        await withRepository(async ({ rootDir, repository }) => {
          // Arrange
          await repository.save(createAdr({ adrId: '001', title: 'Package separation', status: 'Accepted' }));
          await repository.save(createAdr({ adrId: '002', title: 'FUSE Hooks Engine is out of v1 scope', status: 'Proposed' }));
          fs.writeFileSync(path.join(rootDir, 'template.md'), '# template\n', 'utf8');

          // Act
          const actual = await repository.findAll({ statuses: [AdrStatus.accepted()] });

          // Assert
          expect(actual).toHaveLength(1);
          expect(actual[0]?.toAdrRef()).toBe('ADR-001');
        });
      });
    });
  });

  describe('save', () => {
    context('同一ADRを別タイトルで保存し直す場合', () => {
      it('slug由来のファイル名へリネームされ内容が更新される', async () => {
        await withRepository(async ({ rootDir, repository }) => {
          // Arrange
          await repository.save(createAdr({ adrId: '001', title: 'Package separation' }));
          const renamedAdr = createAdr({ adrId: '001', title: 'Separate config files' });

          // Act
          await repository.save(renamedAdr);
          const actual = {
            oldPathExists: fs.existsSync(path.join(rootDir, '001-package-separation.md')),
            newPath: path.join(rootDir, '001-separate-config-files.md'),
            newContent: fs.readFileSync(path.join(rootDir, '001-separate-config-files.md'), 'utf8'),
          };

          // Assert
          expect(actual.oldPathExists).toBe(false);
          expect(fs.existsSync(actual.newPath)).toBe(true);
          expect(actual.newContent.endsWith('\n')).toBe(true);
          expect(actual.newContent).toContain('# Separate config files');
        });
      });
    });
  });

  describe('nextId', () => {
    context('template.mdを含む既存ADRがある場合', () => {
      it('templateを無視して最大IDの次番号を返す', async () => {
        await withRepository(async ({ rootDir, repository }) => {
          // Arrange
          await repository.save(createAdr({ adrId: '001', title: 'Package separation' }));
          await repository.save(createAdr({ adrId: '011', title: 'Temporary 4-layer definition with return path to 5-layer', status: 'Proposed' }));
          fs.writeFileSync(path.join(rootDir, 'template.md'), '# template\n', 'utf8');

          // Act
          const actual = await repository.nextId();

          // Assert
          expect(actual.equals(AdrId.create('012'))).toBe(true);
        });
      });
    });
  });
});
