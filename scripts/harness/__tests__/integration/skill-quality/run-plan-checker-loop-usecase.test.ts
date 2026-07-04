// @layer test
// @unit skill-quality
// @story H12-03
import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RunPlanCheckerLoopUseCase } from '../../../skill-quality/application/usecases/run-plan-checker-loop-usecase.js';

function createMockPlanCheckExecutorPort(
  results: Array<{ coverageRate: number; gaps: string[]; revision?: string }> = []
) {
  let idx = 0;
  return {
    evaluate: vi.fn().mockImplementation(async () => {
      const r = results[idx++] ?? { coverageRate: 100, gaps: [] };
      return r;
    }),
  };
}

target('RunPlanCheckerLoopUseCase', () => {

  // IT-UC-PlanLoop-001
  describe('execute: 1 回目評価で gaps=[] になり PASSED で終了すること', () => {
    context('PlanCheckExecutorPort が 1 回目→{ coverageRate: 100, gaps: [] } を返す場合', () => {
      it('output.status=PASSED, loopHistory.length=1, escalationRequired=false', async () => {
        // Arrange
        const mockExecutor = createMockPlanCheckExecutorPort([
          { coverageRate: 100, gaps: [] },
        ]);
        const usecase = new RunPlanCheckerLoopUseCase(mockExecutor);
        // Act
        const actual = await usecase.execute({ planDocument: '...', storyId: 'H12-03' });
        // Assert
        expect(actual.status).toBe('PASSED');
        expect(actual.loopHistory).toHaveLength(1);
        expect(actual.escalationRequired).toBe(false);
      });
    });
  });

  // IT-UC-PlanLoop-002
  describe('execute: 2 回目評価で gaps=[] になり PASSED で終了すること', () => {
    context('1 回目→gaps 非空, 2 回目→gaps=[] の場合', () => {
      it('output.status=PASSED, loopHistory.length=2, escalationRequired=false', async () => {
        // Arrange
        const mockExecutor = createMockPlanCheckExecutorPort([
          { coverageRate: 60, gaps: ['gap1'] },
          { coverageRate: 100, gaps: [] },
        ]);
        const usecase = new RunPlanCheckerLoopUseCase(mockExecutor);
        // Act
        const actual = await usecase.execute({ planDocument: '...', storyId: 'H12-03' });
        // Assert
        expect(actual.status).toBe('PASSED');
        expect(actual.loopHistory).toHaveLength(2);
      });
    });
  });

  // IT-UC-PlanLoop-003
  describe('execute: 3 回全て gaps 非空で FAILED_EXCEEDED になること', () => {
    context("全 3 回→gaps=['gap1'] の場合", () => {
      it('output.status=FAILED_EXCEEDED, loopHistory.length=3, escalationRequired=true', async () => {
        // Arrange
        const mockExecutor = createMockPlanCheckExecutorPort([
          { coverageRate: 50, gaps: ['gap1'] },
          { coverageRate: 50, gaps: ['gap1'] },
          { coverageRate: 50, gaps: ['gap1'] },
        ]);
        const usecase = new RunPlanCheckerLoopUseCase(mockExecutor);
        // Act
        const actual = await usecase.execute({ planDocument: '...', storyId: 'H12-03' });
        // Assert
        expect(actual.status).toBe('FAILED_EXCEEDED');
        expect(actual.loopHistory).toHaveLength(3);
        expect(actual.escalationRequired).toBe(true);
      });
    });
  });

  // IT-UC-PlanLoop-004
  describe('execute: PlanCheckExecutorPort が例外をスローした場合にエラーが伝播すること', () => {
    context('PlanCheckExecutorPort が throw new Error を返す場合', () => {
      it('エラーが UseCase 外に伝播する', async () => {
        // Arrange
        const mockExecutor = { evaluate: vi.fn().mockRejectedValue(new Error('executor error')) };
        const usecase = new RunPlanCheckerLoopUseCase(mockExecutor);
        // Act & Assert
        await expect(usecase.execute({ planDocument: '...', storyId: 'H12-03' })).rejects.toThrow('executor error');
      });
    });
  });

});
