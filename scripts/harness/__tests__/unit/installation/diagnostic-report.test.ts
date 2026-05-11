// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145

import { describe, expect, it } from "vitest";
import { DiagnosticFinding } from "../../../installation/domain/diagnostic-finding.js";
import { DiagnosticReport } from "../../../installation/domain/diagnostic-report.js";
import { target, context } from "../../helpers/test-helpers.js";

function createFinding(overrides: Partial<Parameters<typeof DiagnosticFinding.create>[0]> = {}) {
  return DiagnosticFinding.create({
    checkId: "package-json-devdep-missing",
    severity: "red",
    target: "package.json",
    message: "package.json に phasegate がありません",
    repairMode: "mechanical",
    repairHint: "npx phasegate install --apply",
    suggestedSkill: null,
    ...overrides,
  });
}

target("DiagnosticReport", () => {
  describe("overallStatusを導出する", () => {
    it("findingがない場合はgreenを返すこと", () => {
      // Act
      const actual = DiagnosticReport.create([]);

      // Assert
      expect(actual.overallStatus).toBe("green");
    });

    it("red findingを含む場合はredを返すこと", () => {
      // Act
      const actual = DiagnosticReport.create([createFinding()]);

      // Assert
      expect(actual.overallStatus).toBe("red");
      expect(actual.hasRedFlag()).toBe(true);
    });
  });

  context("同じcheckIdのfindingが複数ある場合", () => {
    it("重複checkIdの不変条件違反を返すこと", () => {
      // Arrange
      const finding = createFinding();

      // Act
      const actual = () => DiagnosticReport.create([finding, finding]);

      // Assert
      expect(actual).toThrow("duplicate checkId");
    });
  });
});
