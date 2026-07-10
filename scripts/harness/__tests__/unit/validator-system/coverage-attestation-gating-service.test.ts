/**
 * @layer test
 * @unit validator-system
 * @story WI-258
 */
import { describe, expect, it } from "vitest";
import { CoverageAttestationGatingService } from "../../../validator-system/domain/services/coverage-attestation-gating-service.js";
import type { CoverageReportGatingModel } from "../../../validator-system/domain/value-objects/coverage-gating-report.js";

describe("CoverageAttestationGatingService", () => {
  describe("check() — attestation ゲート判定（WI-258 / ADR-030 §Decision.3.②）", () => {
    it("attestation 参照付きの ✅ のみのファイルは violation も warning も生成しないこと", () => {
      // Arrange
      const service = new CoverageAttestationGatingService();
      const models: CoverageReportGatingModel[] = [
        {
          path: "docs/product/construction/x/coverage_report.md",
          hasLegacyMarker: false,
          claims: [
            { lineNumber: 10, hasAttestationRef: true },
            { lineNumber: 12, hasAttestationRef: true },
          ],
        },
      ];

      // Act
      const report = service.check(models);

      // Assert
      expect(report.hasViolations()).toBe(false);
      expect(report.violations).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
      expect(report.legacyCount).toBe(0);
    });

    it("attestation 参照の無い ✅ は violation（fail-closed）になること", () => {
      // Arrange
      const service = new CoverageAttestationGatingService();
      const models: CoverageReportGatingModel[] = [
        {
          path: "docs/product/construction/x/coverage_report.md",
          hasLegacyMarker: false,
          claims: [
            { lineNumber: 10, hasAttestationRef: true },
            { lineNumber: 20, hasAttestationRef: false },
          ],
        },
      ];

      // Act
      const report = service.check(models);

      // Assert
      expect(report.hasViolations()).toBe(true);
      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].severity).toBe("error");
      expect(report.violations[0].message).toContain(":20");
    });

    it("ungated-legacy マーカー付きファイルは免除され warning に件数計上されること", () => {
      // Arrange
      const service = new CoverageAttestationGatingService();
      const models: CoverageReportGatingModel[] = [
        {
          path: "docs/product/construction/legacy/coverage_report.md",
          hasLegacyMarker: true,
          claims: [
            { lineNumber: 10, hasAttestationRef: false },
            { lineNumber: 11, hasAttestationRef: false },
          ],
        },
      ];

      // Act
      const report = service.check(models);

      // Assert
      expect(report.hasViolations()).toBe(false);
      expect(report.legacyCount).toBe(1);
      expect(report.warnings).toHaveLength(1);
      expect(report.warnings[0].severity).toBe("warning");
      expect(report.warnings[0].message).toContain("ungated-legacy");
    });

    it("✅ を一切含まないファイルは violation も warning も生成しないこと（対象外）", () => {
      // Arrange
      const service = new CoverageAttestationGatingService();
      const models: CoverageReportGatingModel[] = [
        {
          path: "docs/product/construction/empty/coverage_report.md",
          hasLegacyMarker: false,
          claims: [],
        },
      ];

      // Act
      const report = service.check(models);

      // Assert
      expect(report.hasViolations()).toBe(false);
      expect(report.warnings).toHaveLength(0);
      expect(report.legacyCount).toBe(0);
    });

    it("legacy 免除ファイルと bare ✅ 違反ファイルが混在する場合、legacyCount と violation が独立に集計されること", () => {
      // Arrange
      const service = new CoverageAttestationGatingService();
      const models: CoverageReportGatingModel[] = [
        {
          path: "a/coverage_report.md",
          hasLegacyMarker: true,
          claims: [{ lineNumber: 5, hasAttestationRef: false }],
        },
        {
          path: "b/coverage_report.md",
          hasLegacyMarker: false,
          claims: [{ lineNumber: 9, hasAttestationRef: false }],
        },
      ];

      // Act
      const report = service.check(models);

      // Assert
      expect(report.legacyCount).toBe(1);
      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].sourcePath).toBe("b/coverage_report.md");
    });
  });
});
