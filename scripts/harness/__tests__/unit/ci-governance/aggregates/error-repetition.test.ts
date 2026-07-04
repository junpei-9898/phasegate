// @layer test
// @unit ci-governance
// @story H13-02
import { target, context, createErrorRepetition } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { ErrorRepetition } from '../../../../ci-governance/domain/aggregates/error-repetition.js';

target('ErrorRepetition', () => {
  describe('生成テスト（create）', () => {
    // UT-ER-001
    context('code="L1-001"をthresholdデフォルトで生成した場合', () => {
      it('occurrenceCount=0・escalated=false・threshold=3で生成される', () => {
        const actual = ErrorRepetition.create('L1-001');
        expect(actual.occurrenceCount).toBe(0);
        expect(actual.escalated).toBe(false);
        expect(actual.threshold).toBe(3);
      });
    });

    // UT-ER-002
    context('code="L2-002", threshold=5を渡した場合', () => {
      it('threshold=5のErrorRepetitionが生成される', () => {
        const actual = ErrorRepetition.create('L2-002', 5);
        expect(actual.threshold).toBe(5);
        expect(actual.escalated).toBe(false);
      });
    });

    // UT-ER-003
    context('デフォルト生成時のEscalationActionを確認した場合', () => {
      it('logLevel="warn"のEscalationActionが設定される', () => {
        const actual = createErrorRepetition();
        expect(actual.getEscalationAction().logLevel).toBe('warn');
      });
    });

    // UT-ER-004
    context('デフォルト生成時のRepetitionResetConditionを確認した場合', () => {
      it('resetOnResolution=trueのRepetitionResetConditionが設定される', () => {
        const actual = createErrorRepetition();
        expect(actual.resetCondition.resetOnResolution).toBe(true);
      });
    });
  });

  describe('incrementテスト', () => {
    // UT-ER-005
    context('初期状態のErrorRepetitionに対してincrement()を呼ぶ場合', () => {
      it('occurrenceCount=1・escalated=falseになる', () => {
        const er = createErrorRepetition();
        const actual = er.increment();
        expect(actual.occurrenceCount).toBe(1);
        expect(actual.escalated).toBe(false);
      });
    });

    // UT-ER-006
    context('occurrenceCount=2（threshold=3）の状態でincrement()を呼ぶ場合', () => {
      it('occurrenceCount=3・escalated=trueになる（INV-6成立）', () => {
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment();
        er = er.increment();
        const actual = er.increment();
        expect(actual.occurrenceCount).toBe(3);
        expect(actual.escalated).toBe(true);
      });
    });

    // UT-ER-007
    context('occurrenceCount=1（threshold=3）の状態でincrement()を呼ぶ場合', () => {
      it('occurrenceCount=2・escalated=falseのまま（threshold未達）', () => {
        let er = createErrorRepetition();
        er = er.increment();
        const actual = er.increment();
        expect(actual.occurrenceCount).toBe(2);
        expect(actual.escalated).toBe(false);
      });
    });

    // UT-ER-008
    context('既にescalated=trueの状態でincrement()を呼ぶ場合', () => {
      it('occurrenceCount=4・escalated=trueのまま', () => {
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment().increment().increment();
        const actual = er.increment();
        expect(actual.occurrenceCount).toBe(4);
        expect(actual.escalated).toBe(true);
      });
    });
  });

  describe('isEscalatedテスト', () => {
    // UT-ER-009
    context('初期状態（escalated=false）でisEscalated()を呼ぶ場合', () => {
      it('falseを返す', () => {
        const actual = createErrorRepetition();
        expect(actual.isEscalated()).toBe(false);
      });
    });

    // UT-ER-010
    context('3回increment後（threshold=3）にisEscalated()を呼ぶ場合', () => {
      it('trueを返す', () => {
        let actual = createErrorRepetition({ threshold: 3 });
        actual = actual.increment().increment().increment();
        expect(actual.isEscalated()).toBe(true);
      });
    });
  });

  describe('resetテスト', () => {
    // UT-ER-011
    context('escalated=true・resetOnResolution=trueの状態でreset()を呼ぶ場合', () => {
      it('occurrenceCount=0・escalated=falseにリセットされる', () => {
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment().increment().increment();
        const actual = er.reset();
        expect(actual.occurrenceCount).toBe(0);
        expect(actual.escalated).toBe(false);
      });
    });

    // UT-ER-012
    context('escalated=falseの状態でreset()を呼ぶ場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-7違反）', () => {
        const er = createErrorRepetition();
        expect(() => er.reset()).toThrow();
      });
    });

    // UT-ER-013
    context('escalated=true・resetOnResolution=falseの状態でreset()を呼ぶ場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-7違反）', () => {
        let er = ErrorRepetition.createWithCondition('L1-001', 3, { resetOnResolution: false });
        er = er.increment().increment().increment();
        expect(() => er.reset()).toThrow();
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-ER-014
    context('負値のoccurrenceCountを直接持つインスタンスを生成しようとした場合（INV-5）', () => {
      it('エラー状態になる', () => {
        expect(() => ErrorRepetition.createWithCount('L1-001', -1, 3)).toThrow();
      });
    });

    // UT-ER-015
    context('increment()後にINV-6整合性を確認した場合', () => {
      it('escalated=trueのとき必ずoccurrenceCount>=threshold', () => {
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment().increment().increment();
        expect(er.escalated).toBe(true);
        expect(er.occurrenceCount).toBeGreaterThanOrEqual(er.threshold);
      });
    });
  });

  describe('getEscalationActionテスト', () => {
    // UT-ER-016
    context('有効なErrorRepetitionに対してgetEscalationAction()を呼ぶ場合', () => {
      it('設定済みのEscalationAction VOが返る', () => {
        const er = createErrorRepetition();
        const actual = er.getEscalationAction();
        expect(actual).toBeDefined();
        expect(actual.logLevel).toBeDefined();
        expect(actual.messageTemplate).toBeDefined();
      });
    });
  });
});
