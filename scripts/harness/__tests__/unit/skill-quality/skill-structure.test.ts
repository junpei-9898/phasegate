// @layer test
// @unit skill-quality
// @story H12-06
// @work-item-id WI-212
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { SkillStructure } from '../../../skill-quality/domain/value-objects/skill-structure.js';

const ALL_REQUIRED_SECTIONS = ['frontmatter', 'languageMetadata', 'purpose', 'inputs', 'outputs', 'prerequisites', 'executionFlow'];

target('SkillStructure', () => {

  describe('default: requiredSections が 7 件の定数値になること（INV-10）', () => {
    context('SkillStructure.default() を呼ぶ場合', () => {
      it('requiredSections が 7 件になる', () => {
        const actual = SkillStructure.default();
        expect(actual.requiredSections).toEqual(ALL_REQUIRED_SECTIONS);
      });
    });
  });

  describe('default: 呼ぶたびに同一インスタンスを返すこと（キャッシュ）', () => {
    context('default() を 2 回呼ぶ場合', () => {
      it('同一インスタンスが返される', () => {
        const first = SkillStructure.default();
        const actual = first === SkillStructure.default();
        expect(actual).toBe(true);
      });
    });
  });

  describe('getMissingSections: 全セクションが揃っている場合は空配列を返すこと', () => {
    context('actualSections が全必須セクションを含む場合', () => {
      it('getMissingSections() が空配列を返す', () => {
        const structure = SkillStructure.default();
        const actual = structure.getMissingSections(ALL_REQUIRED_SECTIONS);
        expect(actual).toEqual([]);
      });
    });
  });

  describe('getMissingSections: 欠落セクションが返されること', () => {
    context("actualSections に 'purpose' と 'outputs' が含まれない場合", () => {
      it("getMissingSections() が ['purpose', 'outputs'] を含む配列を返す", () => {
        const structure = SkillStructure.default();
        const actual = structure.getMissingSections(['frontmatter', 'languageMetadata', 'inputs', 'prerequisites', 'executionFlow']);
        expect(actual).toEqual(['purpose', 'outputs']);
      });
    });
  });

  describe('getMissingSections: actualSections=[] の場合は全セクションが欠落', () => {
    context('actualSections=[] の場合', () => {
      it('getMissingSections() が 7 件を返す', () => {
        const structure = SkillStructure.default();
        const actual = structure.getMissingSections([]);
        expect(actual).toEqual(ALL_REQUIRED_SECTIONS);
      });
    });
  });

});
