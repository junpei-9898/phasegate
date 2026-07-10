/**
 * @layer test
 * @unit validator-system
 * @story WI-258
 *
 * WI-258 / ADR-030 §Decision.3.②: 実 corpus 統合テスト。
 * backfill 後の全 coverage_report が L2-016 で violation 0 件かつ warning に legacy 件数を報告することを保証する。
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CoverageAttestationGatingService } from "../../../validator-system/domain/services/coverage-attestation-gating-service.js";
import { FileSystemCoverageAttestationGatingAdapter } from "../../../validator-system/infrastructure/adapters/file-system-coverage-attestation-gating-adapter.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..", "..", "..", "..");

describe("coverage-attestation-gating 実 corpus 統合（WI-258）", () => {
  it("backfill 後の全 coverage_report が violation 0 件になること（bare ✅ が残っていない）", async () => {
    // Arrange
    const adapter = new FileSystemCoverageAttestationGatingAdapter(REPO_ROOT);
    const service = new CoverageAttestationGatingService();

    // Act
    const models = await adapter.collect();
    const report = service.check(models);

    // Assert
    expect(report.violations).toEqual([]);
    expect(report.hasViolations()).toBe(false);
  });

  it("✅ を含む legacy コーパスが ungated-legacy warning として件数報告されること（見える負債）", async () => {
    // Arrange
    const adapter = new FileSystemCoverageAttestationGatingAdapter(REPO_ROOT);
    const service = new CoverageAttestationGatingService();

    // Act
    const models = await adapter.collect();
    const report = service.check(models);

    // Assert: 走査結果が空でないこと（corpus が存在すること）と、legacy 件数が warning 件数に一致すること。
    expect(models.length).toBeGreaterThan(0);
    expect(report.legacyCount).toBe(report.warnings.length);
    // 現状 6 件の legacy コーパス（✅ を含み backfill 済み）が存在する。
    expect(report.legacyCount).toBeGreaterThanOrEqual(1);
  });
});
