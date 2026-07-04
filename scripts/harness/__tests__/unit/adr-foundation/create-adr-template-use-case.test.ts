// @layer test
// @story H05-01
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { CreateAdrTemplateUseCase } from '../../../adr-foundation/application/usecases/create-adr-template-use-case.js';
import {
  InvalidAdrDateError,
  TemplateOutputConflictError,
} from '../../../adr-foundation/application/dto/application-errors.js';
import type { AdrRepositoryPort } from '../../../adr-foundation/domain/ports/adr-repository-port.js';
import type { AdrDocumentParserPort } from '../../../adr-foundation/domain/ports/adr-document-parser-port.js';
import { AdrId } from '../../../adr-foundation/domain/value-objects/adr-id.js';

const createRepositoryMock = () =>
  ({
    findById: vi.fn(),
    findByRef: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    exists: vi.fn(),
    nextId: vi.fn(),
  }) satisfies AdrRepositoryPort;

const createDocumentParserMock = () =>
  ({
    parseDocument: vi.fn(),
    serializeDocument: vi.fn(),
  }) satisfies AdrDocumentParserPort;

target('CreateAdrTemplateUseCase', () => {
  describe('execute', () => {
    describe('新規ADRテンプレートを生成する', () => {
      // IT-AF-010
      context('タイトル未指定で実行した場合', () => {
        it('プレースホルダ付きテンプレートが生成される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          adrRepository.nextId.mockResolvedValue(AdrId.create('001'));
          adrRepository.exists.mockResolvedValue(false);
          documentParser.serializeDocument.mockImplementation((adr) => {
            const frontmatter = adr.getFrontmatter().toPrimitives();
            return `---\nadr_id: ${frontmatter.adr_id}\ntitle: ${frontmatter.title}\nstatus: ${frontmatter.status}\ndate: ${frontmatter.date}\n---\n\n## Context\n\nContext\n\n## Decision\n\nDecision\n\n## Consequences\n\nConsequences\n\n## Alternatives\n\nAlternatives\n`;
          });
          const sut = new CreateAdrTemplateUseCase(adrRepository, documentParser);

          // Act
          const actual = await sut.execute({});

          // Assert
          expect(actual.markdown).toContain('Short decision title');
          expect(actual.markdown).toContain('## Context');
          expect(actual.markdown).toContain('## Decision');
          expect(actual.markdown).toContain('## Consequences');
          expect(actual.markdown).toContain('## Alternatives');
          expect(actual.recommendedPath).toBe('docs/ADR/001-short-decision-title.md');
        });
      });

      // IT-AF-011
      context('タイトル・status・dateを指定した場合', () => {
        it('指定値が反映されたカスタムテンプレートが生成される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          adrRepository.nextId.mockResolvedValue(AdrId.create('001'));
          adrRepository.exists.mockResolvedValue(false);
          documentParser.serializeDocument.mockImplementation((adr) => {
            const frontmatter = adr.getFrontmatter().toPrimitives();
            return `title: ${frontmatter.title}\nstatus: ${frontmatter.status}\ndate: ${frontmatter.date}`;
          });
          const sut = new CreateAdrTemplateUseCase(adrRepository, documentParser);

          // Act
          const actual = await sut.execute({
            title: 'Package separation',
            status: 'Accepted',
            date: '2026-03-13',
          });

          // Assert
          expect(actual.markdown).toContain('Package separation');
          expect(actual.markdown).toContain('Accepted');
          expect(actual.markdown).toContain('2026-03-13');
          expect(actual.frontmatterDefaults).toMatchObject({
            adrId: '001',
            title: 'Package separation',
            status: 'Accepted',
            date: '2026-03-13',
          });
        });
      });

      // IT-AF-012
      context('includeArchgateExample=trueを指定した場合', () => {
        it('archgateサンプルが含まれたテンプレートが生成される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          adrRepository.nextId.mockResolvedValue(AdrId.create('001'));
          adrRepository.exists.mockResolvedValue(false);
          documentParser.serializeDocument.mockImplementation((adr) =>
            JSON.stringify(adr.getFrontmatter().toPrimitives()),
          );
          const sut = new CreateAdrTemplateUseCase(adrRepository, documentParser);

          // Act
          const actual = await sut.execute({ includeArchgateExample: true });

          // Assert
          expect(actual.markdown).toContain('archgate');
          expect(actual.markdown).toContain('validator_id');
          expect(actual.markdown).toContain('error_code');
        });
      });

      // IT-AF-013
      context('既存ADRがある場合', () => {
        it('次番号が正しく採番される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          adrRepository.nextId.mockResolvedValue(AdrId.create('012'));
          adrRepository.exists.mockResolvedValue(false);
          documentParser.serializeDocument.mockImplementation((adr) =>
            JSON.stringify(adr.getFrontmatter().toPrimitives()),
          );
          const sut = new CreateAdrTemplateUseCase(adrRepository, documentParser);

          // Act
          const actual = await sut.execute({ title: 'Validator stack detection' });

          // Assert
          expect(actual.recommendedPath).toBe('docs/ADR/012-validator-stack-detection.md');
          expect(actual.frontmatterDefaults.adrId).toBe('012');
        });
      });

      // IT-AF-014
      context('date不正形式を指定した場合', () => {
        it('InvalidAdrDateErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          adrRepository.nextId.mockResolvedValue(AdrId.create('001'));
          adrRepository.exists.mockResolvedValue(false);
          const sut = new CreateAdrTemplateUseCase(adrRepository, documentParser);

          // Act
          const actual = sut.execute({ date: '2026/03/13' });

          // Assert
          await expect(actual).rejects.toThrow(InvalidAdrDateError);
        });
      });

      context('推奨出力先が既存ADRと衝突する場合', () => {
        it('TemplateOutputConflictErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          adrRepository.nextId.mockResolvedValue(AdrId.create('001'));
          adrRepository.exists.mockResolvedValue(true);
          const sut = new CreateAdrTemplateUseCase(adrRepository, documentParser);

          // Act
          const actual = sut.execute({});

          // Assert
          await expect(actual).rejects.toThrow(TemplateOutputConflictError);
        });
      });
    });
  });
});
