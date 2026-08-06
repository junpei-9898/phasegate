// @unit quick-mode
// @layer test
// @story H10-01
// @work-item-id WI-372
import { describe, expect, it } from "vitest";
import { CategoryOverrideRules } from "../../../../../quick-mode/domain/value-objects/category-override-rules.js";
import { QuickModeConfigError } from "../../../../../quick-mode/domain/value-objects/quick-mode-config.js";
import { context, target } from "../../../../helpers/test-helpers.js";

target("CategoryOverrideRules", () => {
  target("create", () => {
    context("undefined が渡された場合", () => {
      // UT-COR-001
      it("undefined から空のルールが生成されること", () => {
        // Arrange
        const raw = undefined;
        // Act
        const actual = CategoryOverrideRules.create(raw);
        // Assert
        expect(actual.isEmpty()).toBe(true);
      });
    });

    context("空オブジェクトが渡された場合", () => {
      // UT-COR-002
      it("空オブジェクトから空のルールが生成されること", () => {
        // Arrange
        const raw = {};
        // Act
        const actual = CategoryOverrideRules.create(raw);
        // Assert
        expect(actual.isEmpty()).toBe(true);
      });
    });

    context("未知のカテゴリキーが含まれる場合", () => {
      // UT-COR-010
      it("未知のカテゴリキーで QuickModeConfigError が発生すること", () => {
        // Arrange
        const raw = { chore: ["results/**"] };
        // Act
        const actual = () => CategoryOverrideRules.create(raw);
        // Assert
        expect(actual).toThrowError(QuickModeConfigError);
        expect(actual).toThrowError(/unknown category/);
      });
    });

    context("値が配列でない場合", () => {
      // UT-COR-011
      it("値が配列でない場合に QuickModeConfigError が発生すること", () => {
        // Arrange
        const raw = { docs: "results/**" } as unknown as Record<string, string[]>;
        // Act
        const actual = () => CategoryOverrideRules.create(raw);
        // Assert
        expect(actual).toThrowError(QuickModeConfigError);
      });
    });

    context("空文字列パターンが含まれる場合", () => {
      // UT-COR-012
      it("空文字列パターンで QuickModeConfigError が発生すること", () => {
        // Arrange
        const raw = { docs: ["results/**", ""] };
        // Act
        const actual = () => CategoryOverrideRules.create(raw);
        // Assert
        expect(actual).toThrowError(QuickModeConfigError);
      });
    });

    context("生成後にプロパティへ再代入した場合", () => {
      // UT-COR-013
      it("TypeError が発生すること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["results/**"] });
        // Act
        const actual = () => {
          (sut as unknown as Record<string, unknown>)["rules"] = {};
        };
        // Assert
        expect(actual).toThrowError(TypeError);
      });
    });
  });

  target("resolve", () => {
    describe("glob パターンでパスをカテゴリへ解決する", () => {
      // UT-COR-003
      it("'results/**' が 'results/a.md' に一致して docs が返ること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["results/**"] });
        // Act
        const actual = sut.resolve("results/a.md");
        // Assert
        expect(actual?.toString()).toBe("docs");
      });

      // UT-COR-004
      it("'**' がディレクトリ区切りを跨いで一致すること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["results/**"] });
        // Act
        const actual = sut.resolve("results/nested/deep/a.md");
        // Assert
        expect(actual?.toString()).toBe("docs");
      });

      // UT-COR-005
      it("'*' がディレクトリ区切りを跨がないこと", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["notes/*.md"] });
        // Act
        const actual = sut.resolve("notes/nested/a.md");
        // Assert
        expect(actual).toBeNull();
      });

      // UT-COR-006
      it("どのパターンにも一致しない場合に null が返ること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["results/**"] });
        // Act
        const actual = sut.resolve("scripts/harness/main.ts");
        // Assert
        expect(actual).toBeNull();
      });

      // UT-COR-007
      it("'?' がディレクトリ区切り以外の1文字に一致すること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["notes/?.md"] });
        // Act
        const actual = sut.resolve("notes/a.md");
        // Assert
        expect(actual?.toString()).toBe("docs");
      });

      // UT-COR-008
      it("正規表現メタ文字がリテラルとして扱われること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["notes/a.md"] });
        // Act
        const actual = sut.resolve("notes/aXmd");
        // Assert
        expect(actual).toBeNull();
      });

      // UT-COR-009
      it("複数カテゴリに一致する場合にリスク優先度が最も高いカテゴリが返ること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({
          docs: ["vendor/**"],
          api: ["vendor/**"],
        });
        // Act
        const actual = sut.resolve("vendor/x.ts");
        // Assert
        expect(actual?.toString()).toBe("api");
      });

      it("空文字列のパスに対して null が返ること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["**"] });
        // Act
        const actual = sut.resolve("");
        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  target("equals", () => {
    describe("ルール内容の同値性を判定する", () => {
      it("同一のルールを持つ場合に true が返ること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["results/**"] });
        const other = CategoryOverrideRules.create({ docs: ["results/**"] });
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      it("異なるルールを持つ場合に false が返ること", () => {
        // Arrange
        const sut = CategoryOverrideRules.create({ docs: ["results/**"] });
        const other = CategoryOverrideRules.create({ docs: ["notes/**"] });
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
