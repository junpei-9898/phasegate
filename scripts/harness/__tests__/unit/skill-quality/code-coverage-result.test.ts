// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CodeCoverageResult } from '../../../skill-quality/domain/value-objects/code-coverage-result.js';

target('CodeCoverageResult', () => {

  describe('create: 有効な範囲値で正常生成', () => {
    context('line=85, branch=80, fn=90 の場合', () => {
      it('正常に生成される', () => {
        expect(() => CodeCoverageResult.create(85, 80, 90)).not.toThrow();
      });
    });
  });

  describe('create: 境界値 0 と 100 で正常生成', () => {
    context('line=0, branch=0, fn=100 の場合', () => {
      it('正常に生成される', () => {
        expect(() => CodeCoverageResult.create(0, 0, 100)).not.toThrow();
      });
    });
  });

  describe('create: line=-1 で INVALID_COVERAGE_RANGE エラー', () => {
    context('line=-1 の場合', () => {
      it('HarnessError(INVALID_COVERAGE_RANGE) がスローされる', () => {
        expect(() => CodeCoverageResult.create(-1, 80, 90)).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_COVERAGE_RANGE') }),
        );
      });
    });
  });

  describe('create: line=101 で INVALID_COVERAGE_RANGE エラー', () => {
    context('line=101 の場合', () => {
      it('HarnessError(INVALID_COVERAGE_RANGE) がスローされる', () => {
        expect(() => CodeCoverageResult.create(101, 80, 90)).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_COVERAGE_RANGE') }),
        );
      });
    });
  });

  describe('create: branch=101 で INVALID_COVERAGE_RANGE エラー', () => {
    context('branch=101 の場合', () => {
      it('HarnessError(INVALID_COVERAGE_RANGE) がスローされる', () => {
        expect(() => CodeCoverageResult.create(80, 101, 90)).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_COVERAGE_RANGE') }),
        );
      });
    });
  });

  describe('equals: 同一 3 フィールドを持つ 2 つは等値', () => {
    context('同一 line/branch/fn の場合', () => {
      it('equals() が true を返す', () => {
        const a = CodeCoverageResult.create(85, 80, 90);
        const b = CodeCoverageResult.create(85, 80, 90);
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });
  });

  describe('equals: lineCoverage のみ異なる場合は非等値', () => {
    context('lineCoverage が異なる場合', () => {
      it('equals() が false を返す', () => {
        const a = CodeCoverageResult.create(85, 80, 90);
        const b = CodeCoverageResult.create(80, 80, 90);
        const actual = a.equals(b);
        expect(actual).toBe(false);
      });
    });
  });

});
