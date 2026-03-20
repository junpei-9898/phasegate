/**
 * @layer test
 * @unit validator-system
 * @story H08-06
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunFullValidationUseCase } from '../../../../validator-system/application/use-cases/run-full-validation-usecase.js';
import { AggregateValidationResultsUseCase } from '../../../../validator-system/application/use-cases/aggregate-validation-results-usecase.js';
import { ValidatorExecutionError } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { createValidationResultContract } from '../helpers.js';

function createFullValidationUseCase(overrides: {
  mockRunL2UseCase?: { execute: ReturnType<typeof vi.fn> };
  mockRunL3UseCase?: { execute: ReturnType<typeof vi.fn> };
  mockRunL4UseCase?: { execute: ReturnType<typeof vi.fn> };
} = {}) {
  const mockRunL2UseCase = overrides.mockRunL2UseCase ?? {
    execute: vi.fn().mockResolvedValue([
      createValidationResultContract({ validatorId: 'L2-001' }),
      createValidationResultContract({ validatorId: 'L2-002' }),
      createValidationResultContract({ validatorId: 'L2-003' }),
    ]),
  };
  const mockRunL3UseCase = overrides.mockRunL3UseCase ?? {
    execute: vi.fn().mockResolvedValue([
      createValidationResultContract({ validatorId: 'L3-001' }),
      createValidationResultContract({ validatorId: 'L3-002' }),
      createValidationResultContract({ validatorId: 'L3-003' }),
      createValidationResultContract({ validatorId: 'L3-004' }),
    ]),
  };
  const mockRunL4UseCase = overrides.mockRunL4UseCase ?? {
    execute: vi.fn().mockResolvedValue([
      createValidationResultContract({ validatorId: 'L4-001' }),
      createValidationResultContract({ validatorId: 'L4-002' }),
      createValidationResultContract({ validatorId: 'L4-003' }),
    ]),
  };
  const aggregateUseCase = new AggregateValidationResultsUseCase();
  return {
    usecase: new RunFullValidationUseCase({
      runL2ValidatorsUseCase: mockRunL2UseCase as never,
      runL3ValidatorsUseCase: mockRunL3UseCase as never,
      runL4ValidatorsUseCase: mockRunL4UseCase as never,
      aggregateValidationResultsUseCase: aggregateUseCase,
    }),
    mockRunL2UseCase,
    mockRunL3UseCase,
    mockRunL4UseCase,
  };
}

target('RunFullValidationUseCase', () => {
  describe('全バリデータの統合実行', () => {
    context('includeL4=trueで全UseCaseがpassの場合', () => {
      it('overallPassed=trueかつtotalValidators=10の統合レポートが返る (IT-UC-RunFull-001)', async () => {
        // Arrange
        const { usecase } = createFullValidationUseCase();
        const input = {
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
          includeL4: true,
          failOnWarning: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.overallPassed).toBe(true);
        expect(actual.totalValidators).toBe(10);
      });
    });

    context('includeL4=falseの場合', () => {
      it('L4UseCaseが呼ばれずtotalValidators=7で集計される (IT-UC-RunFull-002)', async () => {
        // Arrange
        const { usecase, mockRunL4UseCase } = createFullValidationUseCase();
        const input = {
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
          includeL4: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(mockRunL4UseCase.execute).not.toHaveBeenCalled();
        expect(actual.totalValidators).toBe(7);
      });
    });

    context('L2でfailが発生した場合', () => {
      it('overallPassed=falseかつfailedValidators>=1の統合レポートが返る (IT-UC-RunFull-003)', async () => {
        // Arrange
        const { usecase } = createFullValidationUseCase({
          mockRunL2UseCase: {
            execute: vi.fn().mockResolvedValue([
              createValidationResultContract({
                validatorId: 'L2-001',
                passed: false,
                errors: [{ code: 'L2-001', severity: 'error', message: 'fail', suggestion: '' }],
              }),
            ]),
          },
          mockRunL3UseCase: {
            execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L3-001' })]),
          },
          mockRunL4UseCase: {
            execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L4-001' })]),
          },
        });
        const input = {
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
          includeL4: true,
          failOnWarning: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.overallPassed).toBe(false);
        expect(actual.failedValidators).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('異常系', () => {
    context('RunL2UseCaseが例外をthrowした場合', () => {
      it('ValidatorExecutionErrorが上位に伝播する (IT-UC-RunFull-004)', async () => {
        // Arrange
        const { usecase } = createFullValidationUseCase({
          mockRunL2UseCase: {
            execute: vi.fn().mockRejectedValue(new ValidatorExecutionError('L2 execution failed')),
          },
          mockRunL3UseCase: { execute: vi.fn() },
          mockRunL4UseCase: { execute: vi.fn() },
        });
        const input = {
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
          includeL4: true,
          failOnWarning: false,
        };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(ValidatorExecutionError);
      });
    });

    context('RunL3UseCaseが例外をthrowした場合', () => {
      it('部分成功を認めずValidatorExecutionErrorが全体に伝播する (IT-UC-RunFull-005)', async () => {
        // Arrange
        const { usecase } = createFullValidationUseCase({
          mockRunL2UseCase: {
            execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L2-001' })]),
          },
          mockRunL3UseCase: {
            execute: vi.fn().mockRejectedValue(new ValidatorExecutionError('L3 execution failed')),
          },
          mockRunL4UseCase: { execute: vi.fn() },
        });
        const input = {
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
          includeL4: true,
          failOnWarning: false,
        };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(ValidatorExecutionError);
      });
    });
  });
});
