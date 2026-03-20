import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { SearchArchgateMappingsUseCase } from '../../../adr-foundation/application/usecases/search-archgate-mappings-use-case.js';
import { ArchgateSearchConditionRequiredError } from '../../../adr-foundation/application/dto/application-errors.js';
import type { AdrRepositoryPort } from '../../../adr-foundation/domain/ports/adr-repository-port.js';
import { ADR } from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';

const createAdr = (
  overrides: Partial<{
    adrId: string;
    title: string;
    status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
    archgate: {
      enforced_by: Array<{ validator_id: string; error_code: string }>;
    };
  }> = {},
): ADR =>
  ADR.create(
    {
      adr_id: overrides.adrId ?? '001',
      title: overrides.title ?? 'Package Separation',
      status: overrides.status ?? 'Accepted',
      date: '2026-03-13',
      archgate: overrides.archgate
        ? {
            adr_id: overrides.adrId ?? '001',
            enforced_by: overrides.archgate.enforced_by,
          }
        : undefined,
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

target('SearchArchgateMappingsUseCase', () => {
  describe('execute', () => {
    describe('archgate情報からADRを検索する', () => {
      // IT-AF-038
      context('validatorId指定で検索した場合', () => {
        it('一致するADRの検索結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findAll.mockResolvedValue([
            createAdr({
              adrId: '001',
              archgate: {
                enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
              },
            }),
            createAdr({
              adrId: '002',
              title: 'Validator Stack Detection',
              archgate: {
                enforced_by: [{ validator_id: 'architecture', error_code: 'L2-014' }],
              },
            }),
          ]);
          const sut = new SearchArchgateMappingsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ validatorId: 'phase-gate' });

          // Assert
          expect(actual).toHaveLength(1);
          expect(actual[0]).toMatchObject({
            validatorId: 'phase-gate',
            adrRef: 'ADR-001',
          });
        });
      });

      // IT-AF-039
      context('errorCode指定で検索した場合', () => {
        it('一致するADRの検索結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findAll.mockResolvedValue([
            createAdr({
              adrId: '001',
              archgate: {
                enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
              },
            }),
            createAdr({
              adrId: '002',
              title: 'Validator Stack Detection',
              archgate: {
                enforced_by: [
                  { validator_id: 'architecture', error_code: 'L1-001' },
                  { validator_id: 'architecture', error_code: 'L2-014' },
                ],
              },
            }),
          ]);
          const sut = new SearchArchgateMappingsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ errorCode: 'L1-001' });

          // Assert
          expect(actual).toHaveLength(2);
          expect(actual.every((item) => item.errorCode === 'L1-001')).toBe(true);
        });
      });

      // IT-AF-040
      context('validatorIdとerrorCodeの両方を指定した場合', () => {
        it('AND検索として両条件に一致する結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findAll.mockResolvedValue([
            createAdr({
              adrId: '001',
              archgate: {
                enforced_by: [{ validator_id: 'architecture', error_code: 'L1-001' }],
              },
            }),
            createAdr({
              adrId: '002',
              title: 'Validator Stack Detection',
              archgate: {
                enforced_by: [
                  { validator_id: 'architecture', error_code: 'L2-014' },
                  { validator_id: 'phase-gate', error_code: 'L1-001' },
                ],
              },
            }),
          ]);
          const sut = new SearchArchgateMappingsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({
            validatorId: 'architecture',
            errorCode: 'L2-014',
          });

          // Assert
          expect(actual).toEqual([
            {
              validatorId: 'architecture',
              errorCode: 'L2-014',
              adrRef: 'ADR-002',
              title: 'Validator Stack Detection',
              status: 'Accepted',
            },
          ]);
        });
      });

      // IT-AF-041
      context('条件を未指定で実行した場合', () => {
        it('ArchgateSearchConditionRequiredErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const sut = new SearchArchgateMappingsUseCase(adrRepository);

          // Act
          const actual = sut.execute({});

          // Assert
          await expect(actual).rejects.toThrow(ArchgateSearchConditionRequiredError);
        });
      });

      // IT-AF-042
      context('archgateを持たないADRのみが存在する場合', () => {
        it('空の検索結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findAll.mockResolvedValue([
            createAdr({ adrId: '003', title: 'Plain ADR' }),
          ]);
          const sut = new SearchArchgateMappingsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ validatorId: 'phase-gate' });

          // Assert
          expect(actual).toEqual([]);
        });
      });
    });
  });
});
