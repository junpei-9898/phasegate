import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { SkillValidationResult } from '../../../skill-quality/domain/value-objects/skill-validation-result.js';

const ALL_REQUIRED_SECTIONS = ['frontmatter', 'purpose', 'inputs', 'outputs', 'prerequisites', 'executionFlow'];

target('SkillValidationResult', () => {

  describe('passed: passed=true, missingSection=[] で生成されること', () => {
    context('SkillValidationResult.passed(actualSections) を呼ぶ場合', () => {
      it('passed=true, missingSection=[] になる', () => {
        const actual = SkillValidationResult.passed(ALL_REQUIRED_SECTIONS);
        expect(actual.passed).toBe(true);
        expect(actual.missingSection).toHaveLength(0);
      });
    });
  });

  describe('failed: missingSection 1 件で正常生成', () => {
    context("missingSection=['purpose'] の場合", () => {
      it('passed=false, missingSection に purpose が含まれる', () => {
        const actual = SkillValidationResult.failed(['purpose'], ALL_REQUIRED_SECTIONS.filter((s) => s !== 'purpose'));
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toContain('purpose');
      });
    });
  });

  describe('failed: missingSection=[] で EMPTY_MISSING_SECTIONS エラー', () => {
    context('missingSection=[] の場合', () => {
      it('HarnessError(EMPTY_MISSING_SECTIONS) がスローされる', () => {
        expect(() => SkillValidationResult.failed([], ALL_REQUIRED_SECTIONS)).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_MISSING_SECTIONS') }),
        );
      });
    });
  });

  describe('equals: 同一 passed/missingSection/actualSections を持つ 2 つは等値', () => {
    context('同一内容の passed で生成した 2 つを比較する場合', () => {
      it('equals() が true を返す', () => {
        const a = SkillValidationResult.passed(ALL_REQUIRED_SECTIONS);
        const b = SkillValidationResult.passed(ALL_REQUIRED_SECTIONS);
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('equals: passed が異なれば非等値', () => {
    context('passed(true) と failed の結果を比較する場合', () => {
      it('equals() が false を返す', () => {
        const a = SkillValidationResult.passed(ALL_REQUIRED_SECTIONS);
        const b = SkillValidationResult.failed(['purpose'], ALL_REQUIRED_SECTIONS.filter((s) => s !== 'purpose'));
        expect(a.equals(b)).toBe(false);
      });
    });
  });

});
