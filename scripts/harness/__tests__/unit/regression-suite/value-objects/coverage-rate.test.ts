// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { CoverageRate } from '../../../../regression-suite/domain/value-objects/coverage-rate.js';

target('CoverageRate', () => {
  // UT-RS-135
  describe('create: value=90 の場合', () => {
    it('正常に生成される', () => {
      const actual = CoverageRate.create(90);
      expect(actual.value).toBe(90);
    });
  });

  // UT-RS-136
  describe('create: value=0 の場合（境界値）', () => {
    it('正常に生成される', () => {
      const actual = CoverageRate.create(0);
      expect(actual.value).toBe(0);
    });
  });

  // UT-RS-137
  describe('create: value=100 の場合（境界値）', () => {
    it('正常に生成される', () => {
      const actual = CoverageRate.create(100);
      expect(actual.value).toBe(100);
    });
  });

  // UT-RS-138
  describe('create: value=-1 の場合（範囲外）', () => {
    context('負の値が渡された場合', () => {
      it('エラーをスロー', () => {
        expect(() => CoverageRate.create(-1)).toThrow();
      });
    });
  });

  // UT-RS-139
  describe('create: value=101 の場合（範囲外）', () => {
    it('エラーをスロー', () => {
      expect(() => CoverageRate.create(101)).toThrow();
    });
  });
});
