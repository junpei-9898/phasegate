// @unit ci-governance
// @layer test
// @story H02-02
// @work-item-id WI-368

import { describe, expect, it } from "vitest";
import {
  INCEPTION_DOC_KINDS,
  InceptionDocKind,
} from "../../../../ci-governance/domain/value-objects/inception-doc-kind.js";
import { context, target } from "../../../helpers/test-helpers.js";

target("InceptionDocKind", () => {
  describe("create / isValid", () => {
    context("許容 kind を渡した場合", () => {
      it("UT-CG-IDK-001: 5 種すべてで生成できる", () => {
        // Arrange
        const inputs = [...INCEPTION_DOC_KINDS];

        // Act
        const actual = inputs.map((input) => InceptionDocKind.create(input).value);

        // Assert
        expect(actual).toEqual(inputs);
      });
    });

    context("未知 kind を渡した場合", () => {
      it("UT-CG-IDK-002: 許容値一覧を含む例外を投げる", () => {
        // Arrange
        const sut = () => InceptionDocKind.create("logical");

        // Act / Assert
        expect(sut).toThrow(/未知の doc-kind/);
        expect(sut).toThrow(/product-overview-plan/);
      });
    });

    context("値の妥当性を問い合わせた場合", () => {
      it("UT-CG-IDK-003: 許容値で true、未知値で false", () => {
        // Arrange
        const inputs = ["product-overview-plan", "unknown-kind"];

        // Act
        const actual = inputs.map((input) => InceptionDocKind.isValid(input));

        // Assert
        expect(actual).toEqual([true, false]);
      });
    });
  });

  describe("templateFileName / docFileName", () => {
    context("各 kind のファイル名を問い合わせた場合", () => {
      it.each([
        ["product-overview-plan", "product_overview_plan.template.md", "product_overview_plan.md"],
        ["product-overview", "product_overview.template.md", "product_overview.md"],
        ["story-writer-plan", "story_writer_plan.template.md", "story_writer_plan.md"],
        ["story-mapping-plan", "story_mapping_plan.template.md", "story_mapping_plan.md"],
        ["unit-design-plan", "unit_design_plan.template.md", "unit_design_plan.md"],
      ])("UT-CG-IDK-004: %s は template=%s doc=%s", (kind, templateFileName, docFileName) => {
        // Arrange
        const sut = InceptionDocKind.create(kind);

        // Act
        const actual = { template: sut.templateFileName, doc: sut.docFileName };

        // Assert
        expect(actual).toEqual({ template: templateFileName, doc: docFileName });
      });
    });
  });

  describe("relativeTargetPath", () => {
    context("既定の paths で解決した場合", () => {
      it("UT-CG-IDK-005: plan は inception/_shared 配下、overview は product 直下に解決する", () => {
        // Arrange
        const planKind = InceptionDocKind.create("story-writer-plan");
        const overviewKind = InceptionDocKind.create("product-overview");

        // Act
        const actual = {
          plan: planKind.relativeTargetPath(),
          overview: overviewKind.relativeTargetPath(),
        };

        // Assert
        expect(actual).toEqual({
          plan: "docs/inception/_shared/story_writer_plan.md",
          overview: "docs/product/product_overview.md",
        });
      });
    });

    context("paths を移設したプロジェクトで解決した場合", () => {
      it("UT-CG-IDK-006: inceptionDocs / designDocs の設定に追従する", () => {
        // Arrange
        const roots = {
          inceptionDocsRoot: "mydocs/inception",
          designDocsRoot: "mydocs/product/construction",
        };

        // Act
        const actual = {
          plan: InceptionDocKind.create("product-overview-plan").relativeTargetPath(roots),
          overview: InceptionDocKind.create("product-overview").relativeTargetPath(roots),
        };

        // Assert
        expect(actual).toEqual({
          plan: "mydocs/inception/_shared/product_overview_plan.md",
          overview: "mydocs/product/product_overview.md",
        });
      });
    });

    context("末尾スラッシュ付きの paths を渡した場合", () => {
      it("UT-CG-IDK-007: 二重スラッシュを作らずに解決する", () => {
        // Arrange
        const roots = {
          inceptionDocsRoot: "mydocs/inception/",
          designDocsRoot: "mydocs/product/construction/",
        };

        // Act
        const actual = {
          plan: InceptionDocKind.create("unit-design-plan").relativeTargetPath(roots),
          overview: InceptionDocKind.create("product-overview").relativeTargetPath(roots),
        };

        // Assert
        expect(actual).toEqual({
          plan: "mydocs/inception/_shared/unit_design_plan.md",
          overview: "mydocs/product/product_overview.md",
        });
      });
    });
  });

  describe("equals", () => {
    context("同じ kind 同士を比較した場合", () => {
      it("UT-CG-IDK-008: true を返す", () => {
        // Arrange
        const left = InceptionDocKind.create("product-overview");
        const right = InceptionDocKind.create("product-overview");

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
