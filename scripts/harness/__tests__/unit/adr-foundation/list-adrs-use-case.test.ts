// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ListAdrsUseCase } from '../../../adr-foundation/application/usecases/list-adrs-use-case.js';
import type { AdrRepositoryPort } from '../../../adr-foundation/domain/ports/adr-repository-port.js';
import { ADR } from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';
import { InvalidAdrStatusError } from '../../../adr-foundation/domain/value-objects/adr-status.js';

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

target('ListAdrsUseCase', () => {
  describe('execute', () => {
    describe('ADR一覧とステータス別集計を返す', () => {
      // IT-AF-005
      context('フィルタなしで実行した場合', () => {
        it('全ADR一覧とsummaryが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const adrs = [
            createAdr({ adrId: '001', title: 'Package Separation', status: 'Accepted' }),
            createAdr({ adrId: '002', title: 'Biome Migration', status: 'Accepted' }),
            createAdr({ adrId: '003', title: 'Quick Mode Eligibility', status: 'Proposed' }),
            createAdr({ adrId: '004', title: 'Config File Separation', status: 'Deprecated' }),
            createAdr({
              adrId: '005',
              title: 'Validator Stack Detection',
              status: 'Superseded',
              supersededBy: 'ADR-006',
            }),
          ];
          adrRepository.findAll.mockResolvedValue(adrs);
          const sut = new ListAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({});

          // Assert
          expect(actual.items).toHaveLength(5);
          expect(actual.summary).toEqual({
            total: 5,
            proposed: 1,
            accepted: 2,
            deprecated: 1,
            superseded: 1,
          });
        });
      });

      // IT-AF-006
      context('status=Acceptedでフィルタした場合', () => {
        it('Accepted状態のADRのみが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findAll.mockResolvedValue([
            createAdr({ adrId: '001', status: 'Accepted' }),
            createAdr({ adrId: '002', status: 'Accepted' }),
          ]);
          const sut = new ListAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ statuses: ['Accepted'] });

          // Assert
          expect(actual.items).toHaveLength(2);
          expect(actual.items.every((item) => item.status === 'Accepted')).toBe(true);
          expect(adrRepository.findAll).toHaveBeenCalledTimes(1);
        });
      });

      // IT-AF-007
      context('複数statusを指定した場合', () => {
        it('OR条件で絞り込まれた結果が返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findAll.mockResolvedValue([
            createAdr({ adrId: '001', status: 'Accepted' }),
            createAdr({ adrId: '002', status: 'Accepted' }),
            createAdr({ adrId: '003', status: 'Proposed' }),
          ]);
          const sut = new ListAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ statuses: ['Accepted', 'Proposed'] });

          // Assert
          expect(actual.items).toHaveLength(3);
          expect(actual.summary).toEqual({
            total: 3,
            proposed: 1,
            accepted: 2,
            deprecated: 0,
            superseded: 0,
          });
        });
      });

      // IT-AF-008
      context('不正なstatus文字列を指定した場合', () => {
        it('InvalidAdrStatusErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const sut = new ListAdrsUseCase(adrRepository);

          // Act
          const actual = sut.execute({ statuses: ['Archived' as never] });

          // Assert
          await expect(actual).rejects.toThrow(InvalidAdrStatusError);
        });
      });

      // IT-AF-009
      context('ADRが0件の場合', () => {
        it('空リストとsummaryが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findAll.mockResolvedValue([]);
          const sut = new ListAdrsUseCase(adrRepository);

          // Act
          const actual = await sut.execute({});

          // Assert
          expect(actual.items).toEqual([]);
          expect(actual.summary).toEqual({
            total: 0,
            proposed: 0,
            accepted: 0,
            deprecated: 0,
            superseded: 0,
          });
        });
      });
    });
  });
});
