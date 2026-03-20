import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
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

target('LoopAttempt', () => {

  describe('create: 有効な値で正常生成', () => {
    context('attemptNumber=1, coverageRate=80 の場合', () => {
      it('正常に生成される', () => {
        expect(() => createLoopAttempt()).not.toThrow();
      });
    });
  });

  describe('create: 境界値 coverageRate=0 で正常生成', () => {
    context('coverageRate=0 の場合', () => {
      it('正常に生成される', () => {
        expect(() => createLoopAttempt({ coverageRate: 0 })).not.toThrow();
      });
    });
  });

  describe('create: attemptNumber=0 で INVALID_LOOP_ATTEMPT エラー', () => {
    context('attemptNumber=0（1 未満）の場合', () => {
      it('HarnessError(INVALID_LOOP_ATTEMPT) がスローされる', () => {
        expect(() => createLoopAttempt({ attemptNumber: 0 })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_LOOP_ATTEMPT') }),
        );
      });
    });
  });

  describe('create: coverageRate=101 で INVALID_LOOP_ATTEMPT エラー', () => {
    context('coverageRate=101 の場合', () => {
      it('HarnessError(INVALID_LOOP_ATTEMPT) がスローされる', () => {
        expect(() => createLoopAttempt({ coverageRate: 101 })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_LOOP_ATTEMPT') }),
        );
      });
    });
  });

  describe('create: coverageRate=-1 で INVALID_LOOP_ATTEMPT エラー', () => {
    context('coverageRate=-1 の場合', () => {
      it('HarnessError(INVALID_LOOP_ATTEMPT) がスローされる', () => {
        expect(() => createLoopAttempt({ coverageRate: -1 })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_LOOP_ATTEMPT') }),
        );
      });
    });
  });

  describe('isPassed: gaps=[] で true を返すこと', () => {
    context('gaps=[] の場合', () => {
      it('isPassed() が true を返す', () => {
        const actual = createLoopAttempt({ gaps: [] }).isPassed();
        expect(actual).toBe(true);
      });
    });
  });

  describe("isPassed: gaps=['未達項目1'] で false を返すこと", () => {
    context("gaps=['未達項目1'] の場合", () => {
      it('isPassed() が false を返す', () => {
        const actual = createLoopAttempt({ gaps: ['未達項目1'] }).isPassed();
        expect(actual).toBe(false);
      });
    });
  });

});
