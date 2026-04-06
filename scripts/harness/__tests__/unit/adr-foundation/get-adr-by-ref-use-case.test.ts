// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { GetAdrByRefUseCase } from '../../../adr-foundation/application/usecases/get-adr-by-ref-use-case.js';
import { AdrNotFoundApplicationError } from '../../../adr-foundation/application/dto/application-errors.js';
import type { AdrRepositoryPort } from '../../../adr-foundation/domain/ports/adr-repository-port.js';
import { ADR } from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';

const createAdr = (
  overrides: Partial<{
    adrId: string;
    title: string;
    status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
    date: string;
    supersededBy: string;
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
      date: overrides.date ?? '2026-03-13',
      superseded_by: overrides.supersededBy,
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

target('GetAdrByRefUseCase', () => {
  describe('execute', () => {
    describe('ADR参照を解決して詳細を返す', () => {
      // IT-AF-001
      context('ADR-001形式で指定した場合', () => {
        it('対応するADRの詳細DTOが返される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const acceptedAdr001 = createAdr();
          adrRepository.findByRef.mockResolvedValue(acceptedAdr001);
          const sut = new GetAdrByRefUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-001' });

          // Assert
          expect(actual.adrRef).toBe('ADR-001');
          expect(actual.title).toBe('Package Separation');
          expect(actual.status).toBe('Accepted');
          expect(actual.date).toBe('2026-03-13');
          expect(actual.filePath).toBe('docs/ADR/001-package-separation.md');
        });
      });

      // IT-AF-002
      context('001形式で指定した場合', () => {
        it('ADR-001形式と同一のADRが取得される', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(createAdr());
          const sut = new GetAdrByRefUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: '001' });

          // Assert
          expect(actual.adrRef).toBe('ADR-001');
          expect(actual.filePath).toBe('docs/ADR/001-package-separation.md');
          expect(adrRepository.findByRef).toHaveBeenCalledWith('001');
        });
      });

      // IT-AF-003
      context('存在しないADR参照を指定した場合', () => {
        it('AdrNotFoundApplicationErrorがスローされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          adrRepository.findByRef.mockResolvedValue(null);
          const sut = new GetAdrByRefUseCase(adrRepository);

          // Act
          const actual = sut.execute({ adrRef: 'ADR-999' });

          // Assert
          await expect(actual).rejects.toThrow(AdrNotFoundApplicationError);
        });
      });

      // IT-AF-004
      context('archgate付きADRを指定した場合', () => {
        it('DTOにfrontmatter・body・archgate情報が正しくマッピングされる', async () => {
          // Arrange
          const adrRepository = createRepositoryMock();
          const acceptedAdr002WithArchgate = createAdr({
            adrId: '002',
            title: 'Validator Stack Detection',
            archgate: {
              enforced_by: [
                { validator_id: 'phase-gate', error_code: 'L1-001' },
                { validator_id: 'architecture', error_code: 'L2-014' },
              ],
            },
          });
          adrRepository.findByRef.mockResolvedValue(acceptedAdr002WithArchgate);
          const sut = new GetAdrByRefUseCase(adrRepository);

          // Act
          const actual = await sut.execute({ adrRef: 'ADR-002' });

          // Assert
          expect(actual.archgate?.enforcedBy).toEqual([
            { validatorId: 'phase-gate', errorCode: 'L1-001' },
            { validatorId: 'architecture', errorCode: 'L2-014' },
          ]);
          expect(actual.body.context).toBe('Context');
          expect(actual.body.decision).toBe('Decision');
        });
      });
    });
  });
});
