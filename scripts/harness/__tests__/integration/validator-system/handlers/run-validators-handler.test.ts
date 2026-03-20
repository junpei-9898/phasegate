/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunValidatorsHandler } from '../../../../validator-system/presentation/handlers/run-validators-handler.js';
import { ValidatorExecutionError } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { createAggregatedReport } from '../helpers.js';

target('RunValidatorsHandler', () => {
  describe('正常系', () => {
    context('全UseCaseがpassの場合', () => {
      it('output出力ありかつexitCode=0が返る (IT-API-RunValidators-001)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(
            createAggregatedReport({ overallPassed: true, totalValidators: 10, failedValidators: 0 })
          ),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'validator-system',
          phase: 'implementation',
        });

        // Assert
        expect(actual.output.length).toBeGreaterThan(0);
        expect(actual.exitCode).toBe(0);
      });
    });

    context('--format ciを渡した場合', () => {
      it('JSON形式でoutput出力される (IT-API-RunValidators-002)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(
            createAggregatedReport({ overallPassed: true, totalValidators: 10, failedValidators: 0 })
          ),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
          format: 'ci',
        });

        // Assert
        expect(() => JSON.parse(actual.output)).not.toThrow();
        expect(actual.exitCode).toBe(0);
      });
    });

    context('--format agentを渡した場合', () => {
      it('AIエージェント向け詳細テキスト形式でoutput出力される (IT-API-RunValidators-003)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(
            createAggregatedReport({ overallPassed: true })
          ),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
          format: 'agent',
        });

        // Assert
        expect(actual.output.length).toBeGreaterThan(0);
      });
    });

    context('--format humanを渡した場合', () => {
      it('human形式でoutput出力される (IT-API-RunValidators-004)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(
            createAggregatedReport({ overallPassed: true })
          ),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
          format: 'human',
        });

        // Assert
        expect(actual.output.length).toBeGreaterThan(0);
      });
    });

    context('--no-l4フラグを指定した場合', () => {
      it('L4バリデータが実行されずexitCode=0が返る (IT-API-RunValidators-005)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(
            createAggregatedReport({ overallPassed: true, totalValidators: 7, failedValidators: 0 })
          ),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
          noL4: true,
          format: 'ci',
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.output);
        expect(parsed.totalValidators).toBe(7);
      });
    });
  });

  describe('バリデーションテスト', () => {
    context('RunFullValidationUseCaseがValidatorExecutionErrorをthrowした場合', () => {
      it('exitCode=2が設定される (IT-API-RunValidators-006)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockRejectedValue(new ValidatorExecutionError('execution failed')),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
        });

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });

    context('RunFullValidationUseCaseが一般エラーをthrowした場合', () => {
      it('exitCode=2が設定される (IT-API-RunValidators-007)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('I/O error')),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
        });

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });

  describe('終了コードテスト', () => {
    context('全バリデータがpassした場合', () => {
      it('終了コード0が設定される (IT-API-RunValidators-008)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(
            createAggregatedReport({ overallPassed: true, failedValidators: 0 })
          ),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
        });

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context('1件以上のバリデータがfailした場合', () => {
      it('終了コード1が設定される (IT-API-RunValidators-009)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(
            createAggregatedReport({ overallPassed: false, failedValidators: 2 })
          ),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
        });

        // Assert
        expect(actual.exitCode).toBe(1);
      });
    });

    context('実行エラー（I/O失敗等）が発生した場合', () => {
      it('終了コード2が設定される (IT-API-RunValidators-010)', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('I/O error')),
        };
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase as never });

        // Act
        const actual = await handler.execute({
          layer: 'all',
          unit: 'unit-a',
          phase: 'impl',
        });

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });
});
