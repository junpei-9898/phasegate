// @layer test
import { describe, expect, it } from "vitest";
import { CiCheckResult } from "../../../harness-api/domain/value-objects/ci-check-result.js";
import { context, target } from "../../helpers/test-helpers.js";

target("CiCheckResult", () => {
  describe("正常系: 有効な引数でCiCheckResultを生成する", () => {
    // UT-CCR-001
    it("validatorResults=[1件passed=true], allPassed=trueでCiCheckResultが生成されること", () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: "L2-001", passed: true }],
        allPassed: true,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(true);
    });

    // UT-CCR-002
    it("一部passed=falseを含む複数件でCiCheckResultが生成されること", () => {
      // Arrange
      const input = {
        validatorResults: [
          { validatorId: "L2-001", passed: true },
          { validatorId: "L2-002", passed: false },
        ],
        allPassed: false,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(false);
      expect(actual.validatorResults).toHaveLength(2);
    });
  });

  describe("不変条件テスト", () => {
    // UT-CCR-003 (INV-5: validatorResultsは1件以上)
    it("validatorResults=[]でエラーをthrowすること", () => {
      // Arrange
      const input = { validatorResults: [], allPassed: true };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-004 (INV-6: allPassed !== 全件passed論理積)
    it("全件passed=trueなのにallPassed=falseでエラーをthrowすること", () => {
      // Arrange
      const input = {
        validatorResults: [
          { validatorId: "L2-001", passed: true },
          { validatorId: "L2-002", passed: true },
        ],
        allPassed: false,
      };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-005 (INV-6逆)
    it("passed=falseを含む結果でallPassed=trueでエラーをthrowすること", () => {
      // Arrange
      const input = {
        validatorResults: [
          { validatorId: "L2-001", passed: true },
          { validatorId: "L2-002", passed: false },
        ],
        allPassed: true,
      };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-006 (INV-6 正常系)
    it("全件passed=true, allPassed=trueで正常に生成されること", () => {
      // Arrange
      const input = {
        validatorResults: [
          { validatorId: "L2-001", passed: true },
          { validatorId: "L2-002", passed: true },
        ],
        allPassed: true,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(true);
    });
  });

  // WI-260 / ADR-017: warning-only failure の severity-aware 集約
  describe("ADR-017 severity-aware 集約 (WI-260)", () => {
    // UT-CCR-007
    it("warning-only failure のみのとき failOnWarning 既定(false)で allPassed=true になること", () => {
      // Arrange
      const validatorResults = [
        { validatorId: "L2-001", passed: true },
        {
          validatorId: "L2-016",
          passed: false,
          errors: [{ code: "L2-016", severity: "warning", message: "ungated-legacy coverage_report" }],
        },
      ];
      // Act
      const actual = CiCheckResult.fromResults(validatorResults);
      // Assert
      expect(actual.allPassed).toBe(true);
    });

    // UT-CCR-008
    it("warning-only failure でも failOnWarning=true 指定時は allPassed=false になること", () => {
      // Arrange
      const validatorResults = [
        { validatorId: "L2-001", passed: true },
        {
          validatorId: "L2-016",
          passed: false,
          errors: [{ code: "L2-016", severity: "warning", message: "ungated-legacy coverage_report" }],
        },
      ];
      // Act
      const actual = CiCheckResult.fromResults(validatorResults, true);
      // Assert
      expect(actual.allPassed).toBe(false);
    });

    // UT-CCR-009
    it("error severity を含む failure は failOnWarning 既定でも allPassed=false になること", () => {
      // Arrange
      const validatorResults = [
        { validatorId: "L2-001", passed: true },
        {
          validatorId: "L2-002",
          passed: false,
          errors: [{ code: "L2-002", severity: "error", message: "metadata violation" }],
        },
      ];
      // Act
      const actual = CiCheckResult.fromResults(validatorResults);
      // Assert
      expect(actual.allPassed).toBe(false);
    });

    // UT-CCR-010 (防御的ケース: passed=false かつ errors=[] は安全側に倒して fail)
    it("passed=false かつ errors=[] の防御的ケースは allPassed=false になること", () => {
      // Arrange
      const validatorResults = [
        { validatorId: "L2-001", passed: true },
        { validatorId: "all-error", passed: false, errors: [] },
      ];
      // Act
      const actual = CiCheckResult.fromResults(validatorResults);
      // Assert
      expect(actual.allPassed).toBe(false);
    });

    // UT-CCR-011 (create の INV-6 も severity-aware で整合すること)
    it("warning-only failure を含み allPassed=true で create が例外を投げないこと", () => {
      // Arrange
      const input = {
        validatorResults: [
          { validatorId: "L2-001", passed: true },
          {
            validatorId: "L2-016",
            passed: false,
            errors: [{ code: "L2-016", severity: "warning", message: "ungated-legacy" }],
          },
        ],
        allPassed: true,
      };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).not.toThrow();
    });
  });
});
