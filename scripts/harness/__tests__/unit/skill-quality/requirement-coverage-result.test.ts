import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RequirementCoverageResult } from '../../../skill-quality/domain/value-objects/requirement-coverage-result.js';

target('RequirementCoverageResult', () => {

  describe('create: total=10, covered=10 で正常生成', () => {
    context('total=10, covered=10 の場合', () => {
      it('正常に生成される', () => {
        expect(() => RequirementCoverageResult.create(10, 10, [])).not.toThrow();
      });
    });
  });

  describe('create: total=10, covered=8, uncoveredIds 2件 で正常生成', () => {
    context('total=10, covered=8, uncoveredIds=[REQ-03, REQ-07] の場合', () => {
      it('正常に生成される', () => {
        expect(() => RequirementCoverageResult.create(10, 8, ['REQ-03', 'REQ-07'])).not.toThrow();
      });
    });
  });

  describe('create: total=0, covered=0 で正常生成', () => {
    context('total=0, covered=0 の場合', () => {
      it('正常に生成される', () => {
        expect(() => RequirementCoverageResult.create(0, 0, [])).not.toThrow();
      });
    });
  });

  describe('create: covered > total で INVALID_REQUIREMENT_COVERAGE エラー', () => {
    context('total=10, covered=11 の場合', () => {
      it('HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる', () => {
        expect(() => RequirementCoverageResult.create(10, 11, [])).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_REQUIREMENT_COVERAGE') }),
        );
      });
    });
  });

  describe('create: uncoveredIds.length が total-covered と不一致でエラー', () => {
    context('total=10, covered=8, uncoveredIds=[1件] の場合', () => {
      it('HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる', () => {
        expect(() => RequirementCoverageResult.create(10, 8, ['REQ-03'])).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_REQUIREMENT_COVERAGE') }),
        );
      });
    });
  });

  describe('create: total=-1 でエラー', () => {
    context('total=-1 の場合', () => {
      it('HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる', () => {
        expect(() => RequirementCoverageResult.create(-1, 0, [])).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_REQUIREMENT_COVERAGE') }),
        );
      });
    });
  });

  describe('coverageRate: total=10, covered=8 で 80 を返すこと', () => {
    context('total=10, covered=8 の場合', () => {
      it('coverageRate が 80 を返す', () => {
        const rcr = RequirementCoverageResult.create(10, 8, ['REQ-03', 'REQ-07']);
        const actual = rcr.coverageRate;
        expect(actual).toBe(80);
      });
    });
  });

  describe('coverageRate: total=0 で 100 を返すこと（特殊ケース）', () => {
    context('total=0, covered=0 の場合', () => {
      it('coverageRate が 100 を返す', () => {
        const actual = RequirementCoverageResult.create(0, 0, []).coverageRate;
        expect(actual).toBe(100);
      });
    });
  });

  describe('coverageRate: total=3, covered=1 で約 33.33 を返すこと', () => {
    context('total=3, covered=1 の場合', () => {
      it('coverageRate が約 33.33 を返す', () => {
        const actual = RequirementCoverageResult.create(3, 1, ['REQ-02', 'REQ-03']).coverageRate;
        expect(actual).toBeCloseTo(33.33, 1);
      });
    });
  });

});
