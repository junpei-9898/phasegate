// @unit attestation
// @layer test
// @story H16-01

import { describe, expect, it } from "vitest";
import { ValidatorOutcome } from "../../../../../attestation/domain/value-objects/validator-outcome.js";
import { context, target } from "../../../../helpers/test-helpers.js";

target("ValidatorOutcome", () => {
  describe("生成テスト", () => {
    context("validatorId / passed / skipped を渡した場合", () => {
      it("正常に生成され各属性を保持する", () => {
        // Arrange / Act
        const outcome = ValidatorOutcome.create({ validatorId: "L3-004", passed: true, skipped: false });
        // Assert
        expect(outcome.validatorId).toBe("L3-004");
        expect(outcome.passed).toBe(true);
        expect(outcome.skipped).toBe(false);
      });
    });

    context("skipped を省略した場合", () => {
      it("skipped は false に正規化される", () => {
        const outcome = ValidatorOutcome.create({ validatorId: "L3-001", passed: true });
        expect(outcome.skipped).toBe(false);
      });
    });

    context("validatorId が空文字の場合", () => {
      it("エラーがスローされる", () => {
        expect(() => ValidatorOutcome.create({ validatorId: "", passed: true })).toThrow(
          /validatorId must not be empty/,
        );
      });
    });
  });

  describe("isGreen テスト", () => {
    it("passed=true なら isGreen=true", () => {
      const outcome = ValidatorOutcome.create({ validatorId: "L3-001", passed: true, skipped: false });
      expect(outcome.isGreen()).toBe(true);
    });

    it("passed=false かつ skipped=true なら isGreen=true", () => {
      const outcome = ValidatorOutcome.create({ validatorId: "L3-002", passed: false, skipped: true });
      expect(outcome.isGreen()).toBe(true);
    });

    it("passed=false かつ skipped=false なら isGreen=false", () => {
      const outcome = ValidatorOutcome.create({ validatorId: "L3-003", passed: false, skipped: false });
      expect(outcome.isGreen()).toBe(false);
    });
  });

  describe("等値性テスト", () => {
    it("全属性一致で equals=true", () => {
      const a = ValidatorOutcome.create({ validatorId: "L3-004", passed: true, skipped: false });
      const b = ValidatorOutcome.create({ validatorId: "L3-004", passed: true, skipped: false });
      expect(a.equals(b)).toBe(true);
    });

    it("passed が異なれば equals=false", () => {
      const a = ValidatorOutcome.create({ validatorId: "L3-004", passed: true });
      const b = ValidatorOutcome.create({ validatorId: "L3-004", passed: false });
      expect(a.equals(b)).toBe(false);
    });
  });
});
