/**
 * @layer test
 * @unit validator-system
 * @story WI-268
 *
 * WI-268 / ADR-030 §Decision.1・§Decision.3.② 第2段: 実 corpus 統合テスト。
 * 現 corpus は実 @attestation 参照 0 件（全 6 ゲート対象が ungated-legacy）のため、
 * L3-007 は「検査対象なし → PASS」で緑になることを保証する。将来 legacy 返済で実参照が
 * 付与された時点から突合が効く（fail-closed）。
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CoverageAttestationVerificationService } from "../../../validator-system/domain/services/coverage-attestation-verification-service.js";
import { FileSystemCoverageAttestationVerificationAdapter } from "../../../validator-system/infrastructure/adapters/file-system-coverage-attestation-verification-adapter.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..", "..", "..", "..");

describe("coverage-attestation-verification 実 corpus 統合（WI-268）", () => {
  it("現 corpus は実 @attestation 参照 0 件のため matrix を読まず PASS になること", async () => {
    // Arrange
    const adapter = new FileSystemCoverageAttestationVerificationAdapter(REPO_ROOT);
    const service = new CoverageAttestationVerificationService();

    // Act
    const collected = await adapter.collect();
    const report = service.verify(collected.references, collected.evidence);

    // Assert: 参照 0 件ゆえ matrix 不在でも fail-closed にならず（matrixError=null）、突合結果も空。
    expect(collected.references).toHaveLength(0);
    expect(collected.matrixError).toBeNull();
    expect(report.hasFindings()).toBe(false);
  });
});
