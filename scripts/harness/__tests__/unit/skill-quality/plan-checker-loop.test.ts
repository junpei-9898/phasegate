import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { PlanCheckerLoop } from '../../../skill-quality/domain/aggregates/plan-checker-loop.js';
import { LoopAttempt } from '../../../skill-quality/domain/value-objects/loop-attempt.js';

function createLoopAttempt(overrides: Partial<{
  attemptNumber: number;
  coverageRate: number;
  gaps: string[];
  revision: string;
}> = {}): LoopAttempt {
  return LoopAttempt.create({
    attemptNumber: overrides.attemptNumber ?? 1,
    coverageRate: overrides.coverageRate ?? 80,
    gaps: overrides.gaps ?? [],
    revision: overrides.revision ?? 'N/A',
  });
}

target('PlanCheckerLoop', () => {

  describe('create: 初期状態が正しく設定されること', () => {
    context('引数なしで create() を呼ぶ場合', () => {
      it('status=RUNNING, loopHistory=[], maxRetries=3 のインスタンスが生成される', () => {
        const actual = PlanCheckerLoop.create();
        expect(actual.status).toBe('RUNNING');
        expect(actual.loopHistory).toHaveLength(0);
        expect(actual.maxRetries).toBe(3);
      });
    });
  });

  describe('create: 2回呼ぶと異なるIDが生成されること', () => {
    context('create() を2回呼ぶ場合', () => {
      it('各インスタンスの id（UUID）が異なる', () => {
        const actual1 = PlanCheckerLoop.create();
        const actual2 = PlanCheckerLoop.create();
        expect(actual1.id).not.toBe(actual2.id);
      });
    });
  });

  describe('addAttempt: gaps=[] の試行を追加すると PASSED に遷移すること', () => {
    context('初期状態で gaps=[] の LoopAttempt を追加する場合', () => {
      it('loopHistory.length=1、status が PASSED に遷移する', () => {
        const loop = PlanCheckerLoop.create();
        const attempt = createLoopAttempt({ gaps: [] });
        loop.addAttempt(attempt);
        const actual = loop;
        expect(actual.loopHistory).toHaveLength(1);
        expect(actual.status).toBe('PASSED');
      });
    });
  });

  describe('addAttempt: gaps 非空の試行を追加すると RUNNING のまま', () => {
    context('初期状態で gaps 非空の LoopAttempt を追加する場合', () => {
      it('loopHistory.length=1、status が RUNNING のまま', () => {
        const loop = PlanCheckerLoop.create();
        const attempt = createLoopAttempt({ gaps: ['未達項目1'] });
        loop.addAttempt(attempt);
        const actual = loop;
        expect(actual.loopHistory).toHaveLength(1);
        expect(actual.status).toBe('RUNNING');
      });
    });
  });

  describe('addAttempt: 2回 gaps 非空の後に gaps=[] の試行を追加すると PASSED に遷移', () => {
    context('2回 gaps 非空試行後に gaps=[] の試行を追加する場合', () => {
      it('loopHistory.length=3、status が PASSED に遷移する', () => {
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['gap1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: ['gap2'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 3, gaps: [] }));
        const actual = loop;
        expect(actual.loopHistory).toHaveLength(3);
        expect(actual.status).toBe('PASSED');
      });
    });
  });

  describe('addAttempt: 4回目の追加で LOOP_ALREADY_COMPLETED エラー（INV-1/INV-3）', () => {
    context('3 回 gaps 非空の試行後（FAILED_EXCEEDED）に 4 回目の addAttempt を試みる場合', () => {
      it('HarnessError(LOOP_ALREADY_COMPLETED) がスローされる', () => {
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['g1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: ['g2'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 3, gaps: ['g3'] }));
        expect(() => loop.addAttempt(createLoopAttempt({ attemptNumber: 4, gaps: [] }))).toThrow(
          expect.objectContaining({ code: expect.stringContaining('LOOP_ALREADY_COMPLETED') }),
        );
      });
    });
  });

  describe('addAttempt: PASSED 後の addAttempt で LOOP_ALREADY_COMPLETED エラー（INV-3）', () => {
    context('status=PASSED 後に addAttempt を呼ぶ場合', () => {
      it('HarnessError(LOOP_ALREADY_COMPLETED) がスローされる', () => {
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ gaps: [] }));
        expect(() => loop.addAttempt(createLoopAttempt({ gaps: [] }))).toThrow(
          expect.objectContaining({ code: expect.stringContaining('LOOP_ALREADY_COMPLETED') }),
        );
      });
    });
  });

  describe('addAttempt: FAILED_EXCEEDED 後の addAttempt で LOOP_ALREADY_COMPLETED エラー（INV-3）', () => {
    context('status=FAILED_EXCEEDED 後に addAttempt を呼ぶ場合', () => {
      it('HarnessError(LOOP_ALREADY_COMPLETED) がスローされる', () => {
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['g1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: ['g2'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 3, gaps: ['g3'] }));
        expect(() => loop.addAttempt(createLoopAttempt({ gaps: [] }))).toThrow(
          expect.objectContaining({ code: expect.stringContaining('LOOP_ALREADY_COMPLETED') }),
        );
      });
    });
  });

  describe('addAttempt: gaps 非空の試行を 3 回追加すると FAILED_EXCEEDED に遷移', () => {
    context('gaps 非空の試行を 3 回追加する場合', () => {
      it('3 回目追加後に status が FAILED_EXCEEDED に遷移する', () => {
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['g1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: ['g2'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 3, gaps: ['g3'] }));
        const actual = loop;
        expect(actual.status).toBe('FAILED_EXCEEDED');
        expect(actual.loopHistory).toHaveLength(3);
      });
    });
  });

  describe('addAttempt: 1回目 gaps 非空、2回目 gaps=[] で PASSED に遷移', () => {
    context('1 回目 gaps 非空、2 回目 gaps=[] の場合', () => {
      it('2 回目追加後に status が PASSED に遷移する', () => {
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['gap1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: [] }));
        const actual = loop;
        expect(actual.status).toBe('PASSED');
        expect(actual.loopHistory).toHaveLength(2);
      });
    });
  });

  describe('maxRetries: INV-4 により常に 3 である', () => {
    context('create() で生成したインスタンスの maxRetries を参照する場合', () => {
      it('maxRetries === 3 である', () => {
        const loop = PlanCheckerLoop.create();
        const actual = loop.maxRetries;
        expect(actual).toBe(3);
      });
    });
  });

});
