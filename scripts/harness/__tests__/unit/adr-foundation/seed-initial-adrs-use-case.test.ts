import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { SeedInitialAdrsUseCase } from '../../../adr-foundation/application/usecases/seed-initial-adrs-use-case.js';
import type { AdrRepositoryPort } from '../../../adr-foundation/domain/ports/adr-repository-port.js';
import type { AdrDocumentParserPort } from '../../../adr-foundation/domain/ports/adr-document-parser-port.js';
import type { SeedAdrDefinition } from '../../../adr-foundation/application/dto/seed-adr-definition.js';
import { AdrValidationError } from '../../../adr-foundation/domain/value-objects/adr-frontmatter.js';

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
    serializeDocument: vi.fn().mockReturnValue('# ADR'),
  }) satisfies AdrDocumentParserPort;

const createSeedDefinitions = (): SeedAdrDefinition[] =>
  Array.from({ length: 11 }, (_, index) => ({
    title: `Decision ${index + 1}`,
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context: `Context ${index + 1}`,
      decision: `Decision ${index + 1}`,
      consequences: `Consequences ${index + 1}`,
      alternatives: `Alternatives ${index + 1}`,
    },
  }));

target('SeedInitialAdrsUseCase', () => {
  describe('execute', () => {
    describe('初期11件ADRを投入する', () => {
      // IT-AF-015
      context('11件定義を正常投入した場合', () => {
        it('created=11, skipped=0の結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          const definitions = createSeedDefinitions();
          adrRepository.exists.mockResolvedValue(false);
          const sut = new SeedInitialAdrsUseCase(adrRepository, documentParser);

          // Act
          const actual = await sut.execute({ definitions });

          // Assert
          expect(actual.created).toHaveLength(11);
          expect(actual.skipped).toEqual([]);
          expect(adrRepository.save).toHaveBeenCalledTimes(11);
        });
      });

      // IT-AF-016
      context('既存ADRありでoverwrite=falseの場合', () => {
        it('既存ADRがskippedに記録される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          const definitions = createSeedDefinitions();
          adrRepository.exists.mockImplementation(async (adrId) =>
            adrId.value === '001' || adrId.value === '002'
          );
          const sut = new SeedInitialAdrsUseCase(adrRepository, documentParser);

          // Act
          const actual = await sut.execute({ definitions, overwrite: false });

          // Assert
          expect(actual.skipped).toEqual(['ADR-001', 'ADR-002']);
          expect(actual.created).toHaveLength(9);
          expect(adrRepository.save).toHaveBeenCalledTimes(9);
        });
      });

      // IT-AF-017
      context('既存ADRありでoverwrite=trueの場合', () => {
        it('既存ADRが上書きされcreatedに記録される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          const definitions = createSeedDefinitions();
          adrRepository.exists.mockImplementation(async (adrId) =>
            adrId.value === '001' || adrId.value === '002'
          );
          const sut = new SeedInitialAdrsUseCase(adrRepository, documentParser);

          // Act
          const actual = await sut.execute({ definitions, overwrite: true });

          // Assert
          expect(actual.created).toHaveLength(11);
          expect(actual.skipped).toEqual([]);
          expect(adrRepository.save).toHaveBeenCalledTimes(11);
        });
      });

      // IT-AF-018
      context('定義数が11件でない場合', () => {
        it('エラーがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          const definitions = createSeedDefinitions().slice(0, 10);
          const sut = new SeedInitialAdrsUseCase(adrRepository, documentParser);

          // Act
          const actual = sut.execute({ definitions });

          // Assert
          await expect(actual).rejects.toThrow();
        });
      });

      // IT-AF-019
      context('不正なADR定義を含む場合', () => {
        it('AdrValidationErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          const definitions = createSeedDefinitions();
          definitions[2] = {
            ...definitions[2],
            title: '',
          };
          adrRepository.exists.mockResolvedValue(false);
          const sut = new SeedInitialAdrsUseCase(adrRepository, documentParser);

          // Act
          const actual = sut.execute({ definitions });

          // Assert
          await expect(actual).rejects.toThrow(AdrValidationError);
          expect(adrRepository.save).toHaveBeenCalledTimes(2);
        });
      });

      // IT-AF-020
      context('既存ADRとIDが衝突しoverwrite=falseの場合', () => {
        it('衝突した件のみskippedに記録され他は正常に投入される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const documentParser = createDocumentParserMock();
          const definitions = createSeedDefinitions();
          adrRepository.exists.mockImplementation(async (adrId) => adrId.value === '005');
          const sut = new SeedInitialAdrsUseCase(adrRepository, documentParser);

          // Act
          const actual = await sut.execute({ definitions, overwrite: false });

          // Assert
          expect(actual.skipped).toEqual(['ADR-005']);
          expect(actual.created).toHaveLength(10);
          expect(adrRepository.save).toHaveBeenCalledTimes(10);
        });
      });
    });
  });
});
