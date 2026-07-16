/**
 * @layer test
 * @unit validator-system
 * @story WI-268
 */
import { describe, expect, it } from "vitest";
import { CoverageAttestationVerificationService } from "../../../validator-system/domain/services/coverage-attestation-verification-service.js";
import type { AttestationReference } from "../../../validator-system/domain/value-objects/attestation-verification-report.js";

describe("CoverageAttestationVerificationService", () => {
  describe("verify() — attestation 参照の matrix 突合（WI-268 / ADR-030 §Decision.1）", () => {
    it("全参照が解決可能スコープに含まれる場合は finding を生成しないこと", () => {
      // Arrange
      const service = new CoverageAttestationVerificationService();
      const references: AttestationReference[] = [
        { id: "H05-02", sourcePath: "docs/product/construction/x/coverage_report.md", lineNumber: 10 },
        { id: "H06-03", sourcePath: "docs/product/construction/x/coverage_report.md", lineNumber: 12 },
      ];
      const evidence = { resolvableScopeIds: new Set(["H05-02", "H06-03", "HF2-05"]) };

      // Act
      const report = service.verify(references, evidence);

      // Assert
      expect(report.hasFindings()).toBe(false);
      expect(report.findings).toHaveLength(0);
    });

    it("解決不能な参照は fail-closed の error finding になること（INV-A）", () => {
      // Arrange
      const service = new CoverageAttestationVerificationService();
      const references: AttestationReference[] = [
        { id: "H05-02", sourcePath: "docs/product/construction/x/coverage_report.md", lineNumber: 10 },
        { id: "GHOST-99", sourcePath: "docs/product/construction/x/coverage_report.md", lineNumber: 20 },
      ];
      const evidence = { resolvableScopeIds: new Set(["H05-02"]) };

      // Act
      const report = service.verify(references, evidence);

      // Assert
      expect(report.hasFindings()).toBe(true);
      expect(report.findings).toHaveLength(1);
      expect(report.findings[0].severity).toBe("error");
      expect(report.findings[0].lineNumber).toBe(20);
      expect(report.findings[0].message).toContain("GHOST-99");
    });

    it("参照が空なら report は空になること（INV-B: 検査対象なし）", () => {
      // Arrange
      const service = new CoverageAttestationVerificationService();
      const evidence = { resolvableScopeIds: new Set<string>() };

      // Act
      const report = service.verify([], evidence);

      // Assert
      expect(report.hasFindings()).toBe(false);
      expect(report.findings).toHaveLength(0);
    });

    it("生成される finding は必ず severity='error' であること（INV-C: blocking tier）", () => {
      // Arrange
      const service = new CoverageAttestationVerificationService();
      const references: AttestationReference[] = [
        { id: "A", sourcePath: "a/coverage_report.md", lineNumber: 1 },
        { id: "B", sourcePath: "b/coverage_report.md", lineNumber: 2 },
      ];
      const evidence = { resolvableScopeIds: new Set<string>() };

      // Act
      const report = service.verify(references, evidence);

      // Assert
      expect(report.findings).toHaveLength(2);
      expect(report.findings.every((f) => f.severity === "error")).toBe(true);
    });
  });
});
