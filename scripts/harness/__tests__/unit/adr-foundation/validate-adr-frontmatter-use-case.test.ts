// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ValidateAdrFrontmatterUseCase } from '../../../adr-foundation/application/usecases/validate-adr-frontmatter-use-case.js';
import { AdrNotFoundApplicationError } from '../../../adr-foundation/application/dto/application-errors.js';
import type { AdrRepositoryPort } from '../../../adr-foundation/domain/ports/adr-repository-port.js';
import { ADR } from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';

const createAdr = (
  overrides: Partial<{
    adrId: string;
    title: string;
    status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
    supersededBy: string;
  }> = {},
): ADR =>
  ADR.create(
    {
      adr_id: overrides.adrId ?? '001',
      title: overrides.title ?? 'Package Separation',
      status: overrides.status ?? 'Accepted',
      date: '2026-03-13',
      superseded_by: overrides.supersededBy,
    },
    {
      context: 'Context',
      decision: 'Decision',
      consequences: 'Consequences',
      alternatives: 'Alternatives',
    },
    new AdrValidationService(),
  );

const createRepositoryMock = () =>
  ({
    findById: vi.fn(),
    findByRef: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    exists: vi.fn(),
    nextId: vi.fn(),
  }) satisfies AdrRepositoryPort;

target('ValidateAdrFrontmatterUseCase', () => {
  describe('execute', () => {
    describe('単一ADRのfrontmatterを検証する', () => {
      // IT-AF-029
      context('正常なADRを指定した場合', () => {
        it('valid=trueの検証結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '001', status: 'Accepted' }));
          const sut = new ValidateAdrFrontmatterUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-001' });

          // Assert
          expect(actual.valid).toBe(true);
          expect(actual.violations).toEqual([]);
          expect(actual.adrRef).toBe('ADR-001');
        });
      });

      // IT-AF-030
      context('frontmatter不正のADRを指定した場合', () => {
        it('violationsを含む検証結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(
            createAdr({
              adrId: '010',
              title: 'Invalid Superseded ADR',
              status: 'Superseded',
              supersededBy: 'ADR-099',
            }),
          );
          adrRepository.exists.mockResolvedValue(false);
          const sut = new ValidateAdrFrontmatterUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-010' });

          // Assert
          expect(actual.valid).toBe(false);
          expect(actual.violations).toHaveLength(1);
          expect(actual.violations[0]).toMatchObject({
            field: 'superseded_by',
            code: 'ADR-SUPERSEDED-TARGET-NOT-FOUND',
          });
        });
      });

      // IT-AF-031
      context('Superseded状態でsuperseded_by参照先が存在する場合', () => {
        it('参照先の実在確認が行われvalid=trueが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(
            createAdr({
              adrId: '004',
              title: 'Config File Separation',
              status: 'Superseded',
              supersededBy: 'ADR-005',
            }),
          );
          adrRepository.exists.mockResolvedValue(true);
          const sut = new ValidateAdrFrontmatterUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-004' });

          // Assert
          expect(actual.valid).toBe(true);
          expect(adrRepository.exists).toHaveBeenCalledTimes(1);
        });
      });

      // IT-AF-032
      context('存在しないADR参照を指定した場合', () => {
        it('AdrNotFoundApplicationErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(null);
          const sut = new ValidateAdrFrontmatterUseCase(adrRepository);

          // Act
          const actual = sut.execute({ adrRef: 'ADR-999' });

          // Assert
          await expect(actual).rejects.toThrow(AdrNotFoundApplicationError);
        });
      });
    });
  });
});
