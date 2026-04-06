// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ValidateAllAdrsUseCase } from '../../../adr-foundation/application/usecases/validate-all-adrs-use-case.js';
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

target('ValidateAllAdrsUseCase', () => {
  describe('execute', () => {
    describe('全ADRを一括検証する', () => {
      // IT-AF-033
      context('全ADRが正常な場合', () => {
        it('valid=true, errors空の検証結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const validAdr001 = createAdr({ adrId: '001', status: 'Accepted' });
          const validAdr002 = createAdr({ adrId: '002', status: 'Proposed', title: 'Biome Migration' });
          adrRepository.findAll.mockResolvedValue([validAdr001, validAdr002]);
          adrRepository.findByRef.mockImplementation(async (adrRef) =>
            adrRef === 'ADR-001' ? validAdr001 : validAdr002
          );
          const sut = new ValidateAllAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({});

          // Assert
          expect(actual.valid).toBe(true);
          expect(actual.results).toHaveLength(2);
          expect(actual.errors).toEqual([]);
        });
      });

      // IT-AF-034
      context('違反ADRが含まれる場合', () => {
        it('valid=false, errorsにHarnessError互換エラーが含まれる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const validAdr001 = createAdr({ adrId: '001', status: 'Accepted' });
          const invalidAdr003 = createAdr({
            adrId: '003',
            title: 'Invalid Superseded ADR',
            status: 'Superseded',
            supersededBy: 'ADR-099',
          });
          adrRepository.findAll.mockResolvedValue([validAdr001, invalidAdr003]);
          adrRepository.findByRef.mockImplementation(async (adrRef) =>
            adrRef === 'ADR-001' ? validAdr001 : invalidAdr003
          );
          adrRepository.exists.mockResolvedValue(false);
          const sut = new ValidateAllAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({});

          // Assert
          expect(actual.valid).toBe(false);
          expect(actual.errors.length).toBeGreaterThan(0);
          expect(actual.errors[0]).toMatchObject({
            code: 'ADR-SUPERSEDED-TARGET-NOT-FOUND',
            metadata: { adr_ref: 'ADR-003' },
          });
        });
      });

      // IT-AF-035
      context('failFast=trueで最初の致命違反がある場合', () => {
        it('最初の違反で検証が打ち切られる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const invalidAdr003 = createAdr({
            adrId: '003',
            title: 'Invalid Superseded ADR',
            status: 'Superseded',
            supersededBy: 'ADR-099',
          });
          const invalidAdr004 = createAdr({
            adrId: '004',
            title: 'Second Invalid Superseded ADR',
            status: 'Superseded',
            supersededBy: 'ADR-098',
          });
          adrRepository.findAll.mockResolvedValue([invalidAdr003, invalidAdr004]);
          adrRepository.findByRef.mockImplementation(async (adrRef) =>
            adrRef === 'ADR-003' ? invalidAdr003 : invalidAdr004
          );
          adrRepository.exists.mockResolvedValue(false);
          const sut = new ValidateAllAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ failFast: true });

          // Assert
          expect(actual.results).toHaveLength(1);
          expect(adrRepository.findByRef).toHaveBeenCalledTimes(1);
        });
      });

      // IT-AF-036
      context('ADRが0件の場合', () => {
        it('valid=trueが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findAll.mockResolvedValue([]);
          const sut = new ValidateAllAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({});

          // Assert
          expect(actual.valid).toBe(true);
          expect(actual.results).toEqual([]);
          expect(actual.errors).toEqual([]);
        });
      });

      // IT-AF-037
      context('違反ADRがある場合', () => {
        it('adr_refがHarnessError内に正しく埋め込まれる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const invalidAdr003 = createAdr({
            adrId: '003',
            title: 'Invalid Superseded ADR',
            status: 'Superseded',
            supersededBy: 'ADR-099',
          });
          adrRepository.findAll.mockResolvedValue([invalidAdr003]);
          adrRepository.findByRef.mockResolvedValue(invalidAdr003);
          adrRepository.exists.mockResolvedValue(false);
          const sut = new ValidateAllAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({});

          // Assert
          expect(actual.errors.every((error) => error.metadata.adr_ref === 'ADR-003')).toBe(true);
        });
      });
    });
  });
});
