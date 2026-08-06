// @unit ci-governance
// @layer test
// @story H02-02
// @work-item-id WI-367

import { describe, expect, it } from "vitest";
import {
  InvalidTemplateNameError,
  TemplateName,
} from "../../../../ci-governance/domain/value-objects/template-name.js";
import { context, target } from "../../../helpers/test-helpers.js";

target("TemplateName", () => {
  describe("create", () => {
    context("英小文字・数字・アンダースコア・ハイフンのみの名前を渡した場合", () => {
      it("UT-CG-TN-001: そのままの値で生成できる", () => {
        // Arrange
        const inputs = ["logical_design", "product-overview", "test", "a1", "unit_test_design"];

        // Act
        const actual = inputs.map((input) => TemplateName.create(input).value);

        // Assert
        expect(actual).toEqual(inputs);
      });
    });

    context("パス区切りや相対参照を含む名前を渡した場合", () => {
      it.each([
        ["親ディレクトリ参照", "../../package.json"],
        ["絶対パス", "/etc/passwd"],
        ["スラッシュ区切り", "templates/logical_design"],
        ["バックスラッシュ区切り", "templates\\logical_design"],
        ["ドットのみ", "."],
        ["二重ドット", ".."],
        ["拡張子付き", "logical_design.md"],
      ])("UT-CG-TN-002: %s（%s）は例外を投げる", (_label, input) => {
        // Arrange
        const sut = () => TemplateName.create(input);

        // Act / Assert
        expect(sut).toThrow(InvalidTemplateNameError);
      });
    });

    context("空文字・大文字・先頭記号を渡した場合", () => {
      it.each([
        ["空文字", ""],
        ["大文字を含む", "LogicalDesign"],
        ["先頭ハイフン", "-logical"],
        ["先頭アンダースコア", "_logical"],
        ["空白を含む", "logical design"],
      ])("UT-CG-TN-003: %s（%s）は例外を投げる", (_label, input) => {
        // Arrange
        const sut = () => TemplateName.create(input);

        // Act / Assert
        expect(sut).toThrow(InvalidTemplateNameError);
      });
    });
  });

  describe("isValid", () => {
    context("値の妥当性を問い合わせた場合", () => {
      it("UT-CG-TN-004: 許容形式で true、パスを含む形式で false", () => {
        // Arrange
        const inputs = ["logical_design", "../secret", "a/b"];

        // Act
        const actual = inputs.map((input) => TemplateName.isValid(input));

        // Assert
        expect(actual).toEqual([true, false, false]);
      });
    });
  });

  describe("equals / toString", () => {
    context("同じ値の TemplateName 同士を比較した場合", () => {
      it("UT-CG-TN-005: equals は true、toString は値を返す", () => {
        // Arrange
        const left = TemplateName.create("logical_design");
        const right = TemplateName.create("logical_design");

        // Act
        const actual = { equal: left.equals(right), text: left.toString() };

        // Assert
        expect(actual).toEqual({ equal: true, text: "logical_design" });
      });
    });

    context("異なる値の TemplateName 同士を比較した場合", () => {
      it("UT-CG-TN-006: equals は false を返す", () => {
        // Arrange
        const left = TemplateName.create("logical_design");
        const right = TemplateName.create("domain_model");

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
