// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CommitReadiness } from '../../../skill-quality/domain/value-objects/commit-readiness.js';

target('CommitReadiness', () => {

  describe('go: ready=true, violations=[] で生成されること', () => {
    context('CommitReadiness.go() を呼ぶ場合', () => {
      it('ready=true, violations=[] のインスタンスが生成される', () => {
        const actual = CommitReadiness.go();
        expect(actual.ready).toBe(true);
        expect(actual.violations).toHaveLength(0);
      });
    });
  });

  describe('noGo: violations 1 件で生成されること', () => {
    context("violations=[{ ruleId: 'L1-001', message: 'error' }] の場合", () => {
      it('ready=false, violations に 1 件が含まれるインスタンスが生成される', () => {
        const violations = [{ ruleId: 'L1-001', message: 'format error' }];
        const actual = CommitReadiness.noGo(violations);
        expect(actual.ready).toBe(false);
        expect(actual.violations).toHaveLength(1);
        expect(actual.violations[0]?.ruleId).toBe('L1-001');
      });
    });
  });

  describe('noGo: violations=[] で EMPTY_VIOLATIONS エラー', () => {
    context('CommitReadiness.noGo([]) を呼ぶ場合', () => {
      it('HarnessError(EMPTY_VIOLATIONS) がスローされる', () => {
        expect(() => CommitReadiness.noGo([])).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_VIOLATIONS') }),
        );
      });
    });
  });

  describe('equals: go() で生成した 2 つは等値', () => {
    context('go() で生成した 2 つの CommitReadiness を比較する場合', () => {
      it('equals() が true を返す', () => {
        const actual = CommitReadiness.go().equals(CommitReadiness.go());
        expect(actual).toBe(true);
      });
    });
  });

  describe('equals: go() と noGo() は非等値', () => {
    context('go() と noGo() で生成した CommitReadiness を比較する場合', () => {
      it('equals() が false を返す', () => {
        const actual = CommitReadiness.go().equals(CommitReadiness.noGo([{ ruleId: 'L1-001', message: 'err' }]));
        expect(actual).toBe(false);
      });
    });
  });

});
