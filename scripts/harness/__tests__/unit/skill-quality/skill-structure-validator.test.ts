// @layer test
// @unit skill-quality
// @story H12-06, WI-241
// @work-item-id WI-212, WI-241
import { describe, expect, it, vi } from "vitest";
import type { SkillFileReaderPort } from "../../../skill-quality/domain/ports/skill-file-reader-port.js";
import { SkillStructureValidator } from "../../../skill-quality/domain/services/skill-structure-validator.js";
import { context, target } from "../../helpers/test-helpers.js";

function createMockSkillFileReaderPort(content = "") {
  return { read: vi.fn().mockResolvedValue(content), exists: vi.fn().mockResolvedValue(true) };
}

/**
 * WI-241: インメモリの SkillFileReaderPort フェイク（インフラポートのフェイクであり、
 * ドメインモックではない）。パス→内容のマップから内容を返す。
 */
class InMemorySkillFileReaderPort implements SkillFileReaderPort {
  constructor(private readonly files: ReadonlyMap<string, string>) {}
  async read(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) throw new Error(`not found: ${filePath}`);
    return content;
  }
  async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }
}

const FULL_SKILL_CONTENT = `---
name: skill-quality
languages: [typescript]
---

# Purpose
This skill ensures quality.

## Inputs
- storyId

## Outputs
- result

## Prerequisites
- none

## ExecutionFlow
1. Run tests
`;

target("SkillStructureValidator", () => {
  describe("validate: 全セクションが揃っている場合は passed を返すこと", () => {
    context("全必須セクションを含む SKILL.md の場合", () => {
      it("SkillValidationResult.passed=true が返される", async () => {
        const port = createMockSkillFileReaderPort(FULL_SKILL_CONTENT);
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate("skills/skill-quality.md");
        expect(actual.passed).toBe(true);
      });
    });
  });

  describe("validate: セクションが欠落している場合は failed を返すこと", () => {
    context("purpose セクションのみを含む SKILL.md の場合", () => {
      it("SkillValidationResult.passed=false が返される", async () => {
        const content = "# Purpose\nThis skill.";
        const port = createMockSkillFileReaderPort(content);
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate("skills/skill-quality.md");
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toEqual([
          "frontmatter",
          "languageMetadata",
          "inputs",
          "outputs",
          "prerequisites",
          "executionFlow",
        ]);
      });
    });
  });

  describe("validate: 空ファイルの場合は全セクション欠落になること", () => {
    context("空文字列の SKILL.md の場合", () => {
      it("passed=false で missingSection が 7 件になる", async () => {
        const port = createMockSkillFileReaderPort("");
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate("skills/skill-quality.md");
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toEqual([
          "frontmatter",
          "languageMetadata",
          "purpose",
          "inputs",
          "outputs",
          "prerequisites",
          "executionFlow",
        ]);
      });
    });
  });

  describe("validate: frontmatter がある場合に frontmatter セクションが認識されること", () => {
    context("--- で始まる YAML frontmatter がある場合", () => {
      it("actualSections に frontmatter が含まれる", async () => {
        const content = `---\nname: test\n---\n\n# Purpose\ntest`;
        const port = createMockSkillFileReaderPort(content);
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate("skills/skill-quality.md");
        expect(actual.actualSections).toContain("frontmatter");
      });
    });
  });

  describe("validate: frontmatter に languages がある場合に languageMetadata が認識されること", () => {
    context("languages が inline array で指定されている場合", () => {
      it("actualSections に languageMetadata が含まれる", async () => {
        const content = `---\nname: test\nlanguages: [typescript]\n---\n\n# Purpose\ntest`;
        const port = createMockSkillFileReaderPort(content);
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate("skills/skill-quality.md");
        expect(actual.actualSections).toContain("languageMetadata");
      });
    });

    context("languages が欠落している場合", () => {
      it("missingSection に languageMetadata が含まれる", async () => {
        const content = `---\nname: test\n---\n\n# Purpose\nThis skill ensures quality.\n\n## Inputs\n- storyId\n\n## Outputs\n- result\n\n## Prerequisites\n- none\n\n## ExecutionFlow\n1. Run tests\n`;
        const port = createMockSkillFileReaderPort(content);
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate("skills/skill-quality.md");
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toContain("languageMetadata");
      });
    });
  });

  // WI-241: skill-kind taxonomy — kind に応じた条件付き構造要件
  describe("validate(WI-241): kind: advisory は frontmatter/languageMetadata/purpose のみで合格すること", () => {
    context("kind: advisory を宣言し purpose のみを持つ SKILL.md の場合", () => {
      it("SkillValidationResult.passed=true が返される", async () => {
        // Arrange
        const path = "skills/advisory-skill/SKILL.md";
        const content = `---\nname: advisory-skill\nkind: advisory\nlanguages: [typescript]\n---\n\n# Purpose\nThis skill advises.\n`;
        const port = new InMemorySkillFileReaderPort(new Map([[path, content]]));
        const validator = new SkillStructureValidator(port);
        // Act
        const actual = await validator.validate(path);
        // Assert
        expect(actual.passed).toBe(true);
      });
    });
  });

  describe("validate(WI-241): kind: advisory でも frontmatter・purpose 欠落は不合格になること", () => {
    context("kind: advisory だが purpose 見出しが無い SKILL.md の場合", () => {
      it("passed=false かつ missingSection に purpose が含まれる", async () => {
        // Arrange
        const path = "skills/advisory-missing/SKILL.md";
        const content = `---\nname: advisory-missing\nkind: advisory\nlanguages: [typescript]\n---\n\nNo purpose heading here.\n`;
        const port = new InMemorySkillFileReaderPort(new Map([[path, content]]));
        const validator = new SkillStructureValidator(port);
        // Act
        const actual = await validator.validate(path);
        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toContain("purpose");
      });
    });

    context("kind: advisory だが frontmatter が無い SKILL.md の場合", () => {
      it("passed=false かつ missingSection に frontmatter/languageMetadata が含まれる", async () => {
        // Arrange
        const path = "skills/advisory-no-fm/SKILL.md";
        const content = `# Purpose\nThis skill advises but has no frontmatter.\n`;
        const port = new InMemorySkillFileReaderPort(new Map([[path, content]]));
        const validator = new SkillStructureValidator(port);
        // Act
        const actual = await validator.validate(path);
        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toContain("frontmatter");
        expect(actual.missingSection).toContain("languageMetadata");
      });
    });
  });

  describe("validate(WI-241): kind 未宣言は lifecycle 扱いで executionFlow 欠落なら不合格になること（fail-closed guard）", () => {
    context("kind を宣言せず executionFlow を欠く SKILL.md の場合", () => {
      it("passed=false かつ missingSection に executionFlow が含まれる（advisory 扱いで誤って合格しない）", async () => {
        // Arrange
        const path = "skills/undeclared-kind/SKILL.md";
        const content = `---\nname: undeclared-kind\nlanguages: [typescript]\n---\n\n# Purpose\nlifecycle by default.\n\n## Inputs\n- storyId\n\n## Outputs\n- result\n\n## Prerequisites\n- none\n`;
        const port = new InMemorySkillFileReaderPort(new Map([[path, content]]));
        const validator = new SkillStructureValidator(port);
        // Act
        const actual = await validator.validate(path);
        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toContain("executionFlow");
      });
    });
  });

  describe("validate(WI-241): kind: lifecycle 明示でも 7 必須が要求されること", () => {
    context("kind: lifecycle を明示し executionFlow を欠く SKILL.md の場合", () => {
      it("passed=false かつ missingSection に executionFlow が含まれる", async () => {
        // Arrange
        const path = "skills/explicit-lifecycle/SKILL.md";
        const content = `---\nname: explicit-lifecycle\nkind: lifecycle\nlanguages: [typescript]\n---\n\n# Purpose\nexplicit lifecycle.\n\n## Inputs\n- storyId\n\n## Outputs\n- result\n\n## Prerequisites\n- none\n`;
        const port = new InMemorySkillFileReaderPort(new Map([[path, content]]));
        const validator = new SkillStructureValidator(port);
        // Act
        const actual = await validator.validate(path);
        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toContain("executionFlow");
      });
    });
  });
});
