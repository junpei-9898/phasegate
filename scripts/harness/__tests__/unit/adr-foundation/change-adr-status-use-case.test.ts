import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ChangeAdrStatusUseCase } from '../../../adr-foundation/application/usecases/change-adr-status-use-case.js';
import {
  AdrNotFoundApplicationError,
  SupersededByRequiredApplicationError,
  SupersededTargetNotFoundApplicationError,
} from '../../../adr-foundation/application/dto/application-errors.js';
import type { AdrRepositoryPort } from '../../../adr-foundation/domain/ports/adr-repository-port.js';
import { ADR, InvalidAdrStatusTransitionError } from '../../../adr-foundation/domain/aggregates/adr.js';
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
      status: overrides.status ?? 'Proposed',
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

target('ChangeAdrStatusUseCase', () => {
  describe('execute', () => {
    describe('ADRのステータスを遷移する', () => {
      // IT-AF-021
      context('Proposed状態のADRにapproveを実行した場合', () => {
        it('Acceptedに遷移し変更前後ステータスが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '001', status: 'Proposed' }));
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-001', action: 'approve' });

          // Assert
          expect(actual.previousStatus).toBe('Proposed');
          expect(actual.currentStatus).toBe('Accepted');
          expect(adrRepository.save).toHaveBeenCalledTimes(1);
        });
      });

      // IT-AF-022
      context('Accepted状態のADRにdeprecateを実行した場合', () => {
        it('Deprecatedに遷移し変更前後ステータスが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '002', status: 'Accepted' }));
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-002', action: 'deprecate' });

          // Assert
          expect(actual.previousStatus).toBe('Accepted');
          expect(actual.currentStatus).toBe('Deprecated');
        });
      });

      // IT-AF-023
      context('Accepted状態のADRにsupersedeを実行した場合', () => {
        it('Supersededに遷移しsuperseded_by付きで変更前後ステータスが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '004', status: 'Accepted' }));
          adrRepository.exists.mockResolvedValue(true);
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = await sut.execute({
            adrRef: 'ADR-004',
            action: 'supersede',
            supersededBy: 'ADR-005',
          });

          // Assert
          expect(actual.previousStatus).toBe('Accepted');
          expect(actual.currentStatus).toBe('Superseded');
          expect(actual.supersededBy).toBe('ADR-005');
        });
      });

      // IT-AF-024
      context('Deprecated状態のADRにreproposeを実行した場合', () => {
        it('Proposedに遷移し変更前後ステータスが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '003', status: 'Deprecated' }));
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-003', action: 'repropose' });

          // Assert
          expect(actual.previousStatus).toBe('Deprecated');
          expect(actual.currentStatus).toBe('Proposed');
          expect(actual.supersededBy).toBeUndefined();
        });
      });

      // IT-AF-025
      context('存在しないADR参照を指定した場合', () => {
        it('AdrNotFoundApplicationErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(null);
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = sut.execute({ adrRef: 'ADR-999', action: 'approve' });

          // Assert
          await expect(actual).rejects.toThrow(AdrNotFoundApplicationError);
        });
      });

      // IT-AF-026
      context('supersede時にsupersededBy参照先が存在しない場合', () => {
        it('SupersededTargetNotFoundApplicationErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '004', status: 'Accepted' }));
          adrRepository.exists.mockResolvedValue(false);
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = sut.execute({
            adrRef: 'ADR-004',
            action: 'supersede',
            supersededBy: 'ADR-099',
          });

          // Assert
          await expect(actual).rejects.toThrow(SupersededTargetNotFoundApplicationError);
        });
      });

      // IT-AF-027
      context('許可されない遷移を実行した場合', () => {
        it('InvalidAdrStatusTransitionErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '002', status: 'Accepted' }));
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = sut.execute({ adrRef: 'ADR-002', action: 'repropose' });

          // Assert
          await expect(actual).rejects.toThrow(InvalidAdrStatusTransitionError);
        });
      });

      // IT-AF-028
      context('正常遷移後', () => {
        it('Repositoryのsaveが呼び出され永続化される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '001', status: 'Proposed' }));
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-001', action: 'approve' });

          // Assert
          expect(adrRepository.save).toHaveBeenCalledTimes(1);
          expect(actual.currentStatus).toBe('Accepted');
        });
      });

      context('supersede時にsupersededByが未指定の場合', () => {
        it('SupersededByRequiredApplicationErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr({ adrId: '004', status: 'Accepted' }));
          const sut = new ChangeAdrStatusUseCase(adrRepository);

          // Act
          const actual = sut.execute({ adrRef: 'ADR-004', action: 'supersede' });

          // Assert
          await expect(actual).rejects.toThrow(SupersededByRequiredApplicationError);
        });
      });
    });
  });
});
