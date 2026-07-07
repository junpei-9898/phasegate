// @layer test
// @unit skill-quality
// @story H12-06, WI-241
// @work-item-id WI-212, WI-241
import { describe, expect, it } from "vitest";
import { SkillStructure } from "../../../skill-quality/domain/value-objects/skill-structure.js";
import { context, target } from "../../helpers/test-helpers.js";

const ALL_REQUIRED_SECTIONS = [
  "frontmatter",
  "languageMetadata",
  "purpose",
  "inputs",
  "outputs",
  "prerequisites",
  "executionFlow",
];
const ADVISORY_REQUIRED_SECTIONS = ["frontmatter", "languageMetadata", "purpose"];

target("SkillStructure", () => {
  describe("default: requiredSections が 7 件の定数値になること（INV-10）", () => {
    context("SkillStructure.default() を呼ぶ場合", () => {
      it("requiredSections が 7 件になる", () => {
        const actual = SkillStructure.default();
        expect(actual.requiredSections).toEqual(ALL_REQUIRED_SECTIONS);
      });
    });
  });

  describe("default: 呼ぶたびに同一インスタンスを返すこと（キャッシュ）", () => {
    context("default() を 2 回呼ぶ場合", () => {
      it("同一インスタンスが返される", () => {
        const first = SkillStructure.default();
        const actual = first === SkillStructure.default();
        expect(actual).toBe(true);
      });
    });
  });

  describe("getMissingSections: 全セクションが揃っている場合は空配列を返すこと", () => {
    context("actualSections が全必須セクションを含む場合", () => {
      it("getMissingSections() が空配列を返す", () => {
        const structure = SkillStructure.default();
        const actual = structure.getMissingSections(ALL_REQUIRED_SECTIONS);
        expect(actual).toEqual([]);
      });
    });
  });

  describe("getMissingSections: 欠落セクションが返されること", () => {
    context("actualSections に 'purpose' と 'outputs' が含まれない場合", () => {
      it("getMissingSections() が ['purpose', 'outputs'] を含む配列を返す", () => {
        const structure = SkillStructure.default();
        const actual = structure.getMissingSections([
          "frontmatter",
          "languageMetadata",
          "inputs",
          "prerequisites",
          "executionFlow",
        ]);
        expect(actual).toEqual(["purpose", "outputs"]);
      });
    });
  });

  describe("getMissingSections: actualSections=[] の場合は全セクションが欠落", () => {
    context("actualSections=[] の場合", () => {
      it("getMissingSections() が 7 件を返す", () => {
        const structure = SkillStructure.default();
        const actual = structure.getMissingSections([]);
        expect(actual).toEqual(ALL_REQUIRED_SECTIONS);
      });
    });
  });

  describe("forKind: lifecycle は 7 必須セクションを返すこと（INV-13）", () => {
    context("forKind('lifecycle') を呼ぶ場合", () => {
      it("requiredSections が 7 件になる", () => {
        // Arrange / Act
        const actual = SkillStructure.forKind("lifecycle");
        // Assert
        expect(actual.requiredSections).toEqual(ALL_REQUIRED_SECTIONS);
      });
    });
  });

  describe("forKind: advisory は 3 必須セクションを返すこと（INV-13）", () => {
    context("forKind('advisory') を呼ぶ場合", () => {
      it("requiredSections が frontmatter/languageMetadata/purpose の 3 件になる", () => {
        // Arrange / Act
        const actual = SkillStructure.forKind("advisory");
        // Assert
        expect(actual.requiredSections).toEqual(ADVISORY_REQUIRED_SECTIONS);
      });
    });
  });

  describe("forKind: advisory 必須集合は lifecycle 必須集合の部分集合であること（INV-14）", () => {
    context("advisory と lifecycle の必須集合を比較する場合", () => {
      it("advisory の全セクションが lifecycle に含まれる", () => {
        // Arrange
        const advisory = SkillStructure.forKind("advisory");
        const lifecycle = SkillStructure.forKind("lifecycle");
        // Act
        const actual = advisory.requiredSections.every((s) => lifecycle.requiredSections.includes(s));
        // Assert
        expect(actual).toBe(true);
        expect(advisory.requiredSections.length).toBeLessThan(lifecycle.requiredSections.length);
      });
    });
  });

  describe("forKind: 同一 kind への呼び出しは同一インスタンスを返すこと（INV-15 キャッシュ）", () => {
    context("forKind('advisory') を 2 回呼ぶ場合", () => {
      it("同一インスタンスが返される", () => {
        // Arrange
        const first = SkillStructure.forKind("advisory");
        // Act
        const actual = first === SkillStructure.forKind("advisory");
        // Assert
        expect(actual).toBe(true);
      });
    });

    context("forKind('lifecycle') と default() が同一インスタンスであること", () => {
      it("default() は forKind(lifecycle) のエイリアスとして同一インスタンスを返す", () => {
        // Arrange / Act
        const actual = SkillStructure.forKind("lifecycle") === SkillStructure.default();
        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
