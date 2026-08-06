// @unit ci-governance
// @layer test
// @story H02-02
// @work-item-id WI-367

import { describe, expect, it } from "vitest";
import { TemplateCatalogEntry } from "../../../../ci-governance/domain/value-objects/template-catalog-entry.js";
import { context, target } from "../../../helpers/test-helpers.js";

target("TemplateCatalogEntry", () => {
  describe("fromFileName", () => {
    context("`<name>.template.<ext>` 形式のファイル名を渡した場合", () => {
      it.each([
        ["logical_design.template.md", "logical_design", "md"],
        ["product_overview_plan.template.md", "product_overview_plan", "md"],
        ["source.template.ts", "source", "ts"],
      ])("UT-CG-TCE-001: %s から name=%s ext=%s を導出する", (fileName, name, extension) => {
        // Arrange
        const input = fileName;

        // Act
        const actual = TemplateCatalogEntry.fromFileName(input);

        // Assert
        expect(actual).not.toBeNull();
        expect({
          name: actual?.name.value,
          fileName: actual?.fileName,
          extension: actual?.extension,
        }).toEqual({ name, fileName, extension });
      });
    });

    context("テンプレート命名規約に合わないファイル名を渡した場合", () => {
      it.each([
        ["テンプレート中置きが無い", "README.md"],
        ["拡張子が無い", "logical_design.template"],
        ["template で終わる", "logical_design.template."],
        ["隠しファイル", ".gitkeep"],
      ])("UT-CG-TCE-002: %s（%s）は null を返す", (_label, fileName) => {
        // Arrange
        const input = fileName;

        // Act
        const actual = TemplateCatalogEntry.fromFileName(input);

        // Assert
        expect(actual).toBeNull();
      });
    });

    context("name 部分が TemplateName の不変条件を満たさない場合", () => {
      it("UT-CG-TCE-003: catalog から除外するため null を返す", () => {
        // Arrange
        const input = "Logical Design.template.md";

        // Act
        const actual = TemplateCatalogEntry.fromFileName(input);

        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});
