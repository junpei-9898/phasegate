/**
 * @layer domain
 * @unit harness-error
 * @story H06-01
 *
 * HarnessError 中心モデルのユニットテスト
 */
import { describe, expect, it } from "vitest";
import { AdrRef } from "../../../harness-error/domain/value-objects/adr-ref.js";
import { ErrorCode } from "../../../harness-error/domain/value-objects/error-code.js";
import { FixExample } from "../../../harness-error/domain/value-objects/fix-example.js";
import type { HarnessErrorProps } from "../../../harness-error/domain/value-objects/harness-error.js";
import { HarnessError } from "../../../harness-error/domain/value-objects/harness-error.js";
import { Severity } from "../../../harness-error/domain/value-objects/severity.js";
import { context, target } from "../../helpers/test-helpers.js";

const createErrorCode = (value = "L1-001") => ErrorCode.create(value);
const createSeverity = (value: "error" | "warning" = "warning") => Severity.create(value);
const createAdrRef = (value = "ADR-001") => AdrRef.create(value);
const createFixExample = (value = "const repaired = true;") => FixExample.create(value);

const buildHarnessError = (overrides: Partial<HarnessErrorProps> = {}) =>
  new HarnessError({
    code: createErrorCode(),
    severity: createSeverity("warning"),
    message: "エラー内容",
    suggestion: "修正案",
    adrRef: null,
    fixExample: null,
    suggestedSkill: null,
    scaffoldCommand: null,
    templatePath: null,
    ...overrides,
  });

target("HarnessError", () => {
  target("equals", () => {
    describe("HarnessError同士を比較する", () => {
      // UT-HE-053
      it("全フィールドが一致する場合にtrueを返すこと", () => {
        // Arrange
        const sut = buildHarnessError({
          adrRef: createAdrRef("ADR-010"),
          fixExample: createFixExample("const fixedValue = 1;"),
        });
        const other = buildHarnessError({
          adrRef: createAdrRef("ADR-010"),
          fixExample: createFixExample("const fixedValue = 1;"),
        });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-060
      it("全必須属性が一致する場合にtrueを返すこと", () => {
        // Arrange
        const sut = buildHarnessError();
        const other = buildHarnessError();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target("hasAdrRef", () => {
    describe("adrRef保持有無を返す", () => {
      // UT-HE-054
      it("adrRefを持つ場合にtrueを返すこと", () => {
        // Arrange
        const sut = buildHarnessError({ adrRef: createAdrRef("ADR-010") });

        // Act
        const actual = sut.hasAdrRef();

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-055
      it("adrRefを持たない場合にfalseを返すこと", () => {
        // Arrange
        const sut = buildHarnessError({ adrRef: null });

        // Act
        const actual = sut.hasAdrRef();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target("hasFixExample", () => {
    describe("fixExample保持有無を返す", () => {
      // UT-HE-056
      it("fixExampleを持つ場合にtrueを返すこと", () => {
        // Arrange
        const sut = buildHarnessError({ fixExample: createFixExample("const fixedValue = 1;") });

        // Act
        const actual = sut.hasFixExample();

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-057
      it("fixExampleを持たない場合にfalseを返すこと", () => {
        // Arrange
        const sut = buildHarnessError({ fixExample: null });

        // Act
        const actual = sut.hasFixExample();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target("toContract", () => {
    describe("Shared Kernel公開DTOへ変換する", () => {
      // UT-HE-058
      it("全フィールドが正しく投影されること", () => {
        // Arrange
        const sut = buildHarnessError({
          code: createErrorCode("L2-010"),
          severity: createSeverity("error"),
          message: "設計順序違反",
          suggestion: "設計書を確認する",
          adrRef: createAdrRef("ADR-010"),
          fixExample: createFixExample("const fixedValue = 1;"),
        });

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual).toEqual({
          code: "L2-010",
          severity: "error",
          message: "設計順序違反",
          suggestion: "設計書を確認する",
          adr_ref: "ADR-010",
          fix_example: "const fixedValue = 1;",
        });
      });
    });
  });

  // ISSUE-007 Wave 3 / H12-03: actionable fields
  target("actionable fields (suggestedSkill / scaffoldCommand / templatePath)", () => {
    describe("3 optional フィールドを保持する", () => {
      // UT-HE-100
      it("suggestedSkill を保持し toContract で snake_case キーで出力されること", () => {
        // Arrange
        const sut = buildHarnessError({ suggestedSkill: "/logical-designer" });

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual.suggested_skill).toBe("/logical-designer");
      });

      // UT-HE-101
      it("scaffoldCommand を保持し toContract で snake_case キーで出力されること", () => {
        // Arrange
        const sut = buildHarnessError({
          scaffoldCommand: "npx phasegate scaffold-design --unit harness-error --phase logical",
        });

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual.scaffold_command).toBe("npx phasegate scaffold-design --unit harness-error --phase logical");
      });

      // UT-HE-102
      it("templatePath を保持し toContract で snake_case キーで出力されること", () => {
        // Arrange
        const sut = buildHarnessError({
          templatePath: "templates/logical_design.template.md",
        });

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual.template_path).toBe("templates/logical_design.template.md");
      });

      // UT-HE-103
      it("3 フィールドが全て null のとき toContract の出力にキーが含まれないこと", () => {
        // Arrange
        const sut = buildHarnessError();

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual).not.toHaveProperty("suggested_skill");
        expect(actual).not.toHaveProperty("scaffold_command");
        expect(actual).not.toHaveProperty("template_path");
      });
    });

    describe("equals が 3 フィールドを比較対象に含む", () => {
      // UT-HE-104
      it("suggestedSkill が異なる場合 false を返すこと", () => {
        // Arrange
        const sut = buildHarnessError({ suggestedSkill: "/logical-designer" });
        const other = buildHarnessError({ suggestedSkill: "/story-implementor" });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });

      // UT-HE-105
      it("scaffoldCommand が異なる場合 false を返すこと", () => {
        // Arrange
        const sut = buildHarnessError({ scaffoldCommand: "npx phasegate scaffold-design --unit a" });
        const other = buildHarnessError({ scaffoldCommand: "npx phasegate scaffold-design --unit b" });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });

      // UT-HE-106
      it("templatePath が異なる場合 false を返すこと", () => {
        // Arrange
        const sut = buildHarnessError({ templatePath: "docs/templates/a.md" });
        const other = buildHarnessError({ templatePath: "docs/templates/b.md" });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });

      // UT-HE-107
      it("3 フィールド全てが一致すれば他のフィールドも一致する場合に true を返すこと", () => {
        // Arrange
        const sut = buildHarnessError({
          suggestedSkill: "/logical-designer",
          scaffoldCommand: "npx phasegate scaffold-design --unit x",
          templatePath: "docs/templates/x.md",
        });
        const other = buildHarnessError({
          suggestedSkill: "/logical-designer",
          scaffoldCommand: "npx phasegate scaffold-design --unit x",
          templatePath: "docs/templates/x.md",
        });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });

    describe("has* メソッド", () => {
      // UT-HE-108
      it("hasSuggestedSkill: 値があれば true / null なら false", () => {
        expect(buildHarnessError({ suggestedSkill: "/x" }).hasSuggestedSkill()).toBe(true);
        expect(buildHarnessError({ suggestedSkill: null }).hasSuggestedSkill()).toBe(false);
      });

      // UT-HE-109
      it("hasScaffoldCommand: 値があれば true / null なら false", () => {
        expect(buildHarnessError({ scaffoldCommand: "npx x" }).hasScaffoldCommand()).toBe(true);
        expect(buildHarnessError({ scaffoldCommand: null }).hasScaffoldCommand()).toBe(false);
      });

      // UT-HE-110
      it("hasTemplatePath: 値があれば true / null なら false", () => {
        expect(buildHarnessError({ templatePath: "docs/x.md" }).hasTemplatePath()).toBe(true);
        expect(buildHarnessError({ templatePath: null }).hasTemplatePath()).toBe(false);
      });
    });
  });

  // WI-335: remediationType（修復方式分類）
  target("remediationType (mechanical / ai-assisted / manual)", () => {
    describe("未設定時の後方互換挙動", () => {
      // UT-HE-111
      it("remediationType 未設定なら effectiveRemediationType が manual を返し toContract に remediation_type が現れないこと", () => {
        // Arrange
        const sut = buildHarnessError();

        // Act
        const actual = sut.toContract();

        // Assert
        expect(sut.remediationType).toBeNull();
        expect(sut.effectiveRemediationType()).toBe("manual");
        expect(sut.isMechanicallyRemediable()).toBe(false);
        expect("remediation_type" in actual).toBe(false);
      });
    });

    describe("設定時の投影", () => {
      // UT-HE-112
      it("remediationType: mechanical を保持し toContract で remediation_type として投影されること", () => {
        // Arrange
        const sut = buildHarnessError({ remediationType: "mechanical" });

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual.remediation_type).toBe("mechanical");
        expect(sut.isMechanicallyRemediable()).toBe(true);
      });

      // UT-HE-113
      it("remediationType が異なる HarnessError 同士は equals が false になること", () => {
        // Arrange
        const sut = buildHarnessError({ remediationType: "mechanical" });
        const other = buildHarnessError({ remediationType: null });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
