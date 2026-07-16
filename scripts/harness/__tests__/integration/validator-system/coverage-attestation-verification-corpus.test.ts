/**
 * @layer test
 * @unit validator-system
 * @story WI-268, WI-275
 *
 * WI-268 / ADR-030 §Decision.1・§Decision.3.② 第2段: 実 corpus 統合テスト。
 * WI-275 の ungated-legacy 返済により、corpus は実 `<!-- @attestation <story-id> -->` 参照を
 * 持つようになった。本テストは matrix 非依存のファイルレベル整合（参照 id が story-id 形式で、
 * 対象ファイルの @story-id ヘッダに宣言された story に一致すること／ungated-legacy 免除ファイル
 * からは収集されないこと）を保証する。matrix に対する authoritative 突合は L3-007 が
 * CI（phasegate:generate-matrix 後）で行う。
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FileSystemCoverageAttestationVerificationAdapter } from "../../../validator-system/infrastructure/adapters/file-system-coverage-attestation-verification-adapter.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..", "..", "..", "..");

describe("coverage-attestation-verification 実 corpus 統合（WI-268 / WI-275）", () => {
  it("WI-275 返済後の corpus は実 @attestation 参照を持ち、全参照 id が story-id 形式であること", async () => {
    // Arrange
    const adapter = new FileSystemCoverageAttestationVerificationAdapter(REPO_ROOT);

    // Act
    const actual = await adapter.collect();

    // Assert: 返済済み corpus は参照を 1 件以上持ち、id は全て HXX-XX 形式の story-id。
    expect(actual.references.length).toBeGreaterThan(0);
    for (const reference of actual.references) {
      expect(reference.id).toMatch(/^H\d{2}-\d{2}$/);
    }
  });

  it("各 @attestation 参照の id が、その coverage_report の @story-id ヘッダに宣言された story に一致すること", async () => {
    // Arrange
    const adapter = new FileSystemCoverageAttestationVerificationAdapter(REPO_ROOT);

    // Act
    const actual = await adapter.collect();

    // Assert: 参照ごとに、出典ファイルの @story-id ヘッダ集合に id が含まれる（ファイルレベル整合）。
    const declaredByPath = new Map<string, Set<string>>();
    for (const reference of actual.references) {
      if (!declaredByPath.has(reference.sourcePath)) {
        const content = readFileSync(join(REPO_ROOT, reference.sourcePath), "utf-8");
        const declared = new Set<string>();
        for (const match of content.matchAll(/^@story-id\s+(H\d{2}-\d{2})\s*$/gm)) {
          declared.add(match[1]);
        }
        declaredByPath.set(reference.sourcePath, declared);
      }
      const declared = declaredByPath.get(reference.sourcePath);
      expect(
        declared?.has(reference.id),
        `${reference.sourcePath}:${reference.lineNumber} の @attestation "${reference.id}" がファイルの @story-id ヘッダに未宣言`,
      ).toBe(true);
    }
  });

  it("ungated-legacy マーカー付きファイル（未返済 legacy）からは参照を収集しないこと", async () => {
    // Arrange
    const adapter = new FileSystemCoverageAttestationVerificationAdapter(REPO_ROOT);

    // Act
    const actual = await adapter.collect();

    // Assert: skill-quality は WI-275 でマーカー残置（返済見送り）のため参照 0 件。
    const fromLegacy = actual.references.filter((r) => r.sourcePath.includes("skill-quality"));
    expect(fromLegacy).toEqual([]);
  });
});
