// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CheckPhaseGateCommandHandler } from '../../../phase-dependency-model/presentation/cli/check-phase-gate-command-handler.js';
import type { PhaseGateResultDto } from '../../../phase-dependency-model/application/dto/phase-gate-result-dto.js';

function createPassedResult(level: 1 | 2 | 3): PhaseGateResultDto {
  return {
    passed: true,
    targetLevel: level,
    blockers: [],
    warnings: [],
    auditRecorded: false,
  };
}

function createFailedResult(level: 1 | 2 | 3): PhaseGateResultDto {
  return {
    passed: false,
    targetLevel: level,
    blockers: ['product_overview.md が未作成'],
    warnings: ['plan QA が未完了'],
    auditRecorded: false,
  };
}

target('CheckPhaseGateCommandHandler', () => {
  describe('execute', () => {
    context('不正なtargetLevelが指定された場合', () => {
      it('終了コード2を返すこと', async () => {
        // Arrange
        const useCase = { execute: vi.fn() };
        const handler = new CheckPhaseGateCommandHandler({
          checkPhaseGateUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({ targetLevel: 5 });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.result).toBeNull();
        expect(actual.text).toContain('invalid target level');
        expect(useCase.execute).not.toHaveBeenCalled();
      });
    });

    context('フェーズゲートに合格する場合', () => {
      it('終了コード0を返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue(createPassedResult(2)),
        };
        const handler = new CheckPhaseGateCommandHandler({
          checkPhaseGateUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({ targetLevel: 2 });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.result?.passed).toBe(true);
        expect(actual.text).toContain('PASSED');
      });
    });

    context('フェーズゲートに失敗する場合', () => {
      it('終了コード1を返しブロッカーを表示すること', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue(createFailedResult(2)),
        };
        const handler = new CheckPhaseGateCommandHandler({
          checkPhaseGateUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({ targetLevel: 2 });

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.result?.passed).toBe(false);
        expect(actual.text).toContain('FAILED');
        expect(actual.text).toContain('product_overview.md が未作成');
      });
    });

    context('unitIdとstoryIdが指定された場合', () => {
      it('ユースケースに正しく引数を渡すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue(createPassedResult(3)),
        };
        const handler = new CheckPhaseGateCommandHandler({
          checkPhaseGateUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({
          targetLevel: 3,
          unitId: 'config-foundation',
          storyId: 'H01-01',
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(useCase.execute).toHaveBeenCalledWith({
          targetLevel: 3,
          unitId: 'config-foundation',
          storyId: 'H01-01',
        });
      });
    });

    context('JSON出力が指定された場合', () => {
      it('JSON形式でテキストを返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue(createPassedResult(1)),
        };
        const handler = new CheckPhaseGateCommandHandler({
          checkPhaseGateUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({
          targetLevel: 1,
          json: true,
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.text);
        expect(parsed.passed).toBe(true);
        expect(parsed.targetLevel).toBe(1);
      });
    });

    context('ユースケースが例外をスローする場合', () => {
      it('終了コード2を返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockRejectedValue(new Error('unexpected')),
        };
        const handler = new CheckPhaseGateCommandHandler({
          checkPhaseGateUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({ targetLevel: 2 });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.result).toBeNull();
        expect(actual.text).toContain('failed unexpectedly');
      });
    });
  });
});
