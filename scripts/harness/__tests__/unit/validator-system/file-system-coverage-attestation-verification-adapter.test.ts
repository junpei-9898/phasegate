/**
 * @layer test
 * @unit validator-system
 * @story WI-268
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemCoverageAttestationVerificationAdapter } from "../../../validator-system/infrastructure/adapters/file-system-coverage-attestation-verification-adapter.js";

let rootDir: string;

async function writeCoverageReport(unit: string, content: string): Promise<void> {
  const dir = path.join(rootDir, "docs", "product", "construction", unit);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "coverage_report.md"), content, "utf-8");
}

async function writeMatrix(matrix: unknown): Promise<void> {
  const dir = path.join(rootDir, ".harness");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "requirement-test-matrix.json"), JSON.stringify(matrix), "utf-8");
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "coverage-verif-adapter-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("FileSystemCoverageAttestationVerificationAdapter", () => {
  describe("collect() — 参照抽出と matrix 突合（WI-268 / ADR-030 §Decision.1）", () => {
    it("@attestation 参照を抽出し、matrix 上でテスト参照を持つ story-id を解決可能スコープに含めること", async () => {
      // Arrange
      await writeCoverageReport("x", "| AC-1 | 内容 | ✅ <!-- @attestation H05-02 --> |\n");
      await writeMatrix({
        stories: [
          { storyId: "H05-02", storyMappings: [{ acId: "AC-1", testReferences: [{ filePath: "a.test.ts" }] }] },
        ],
      });
      const adapter = new FileSystemCoverageAttestationVerificationAdapter(rootDir);

      // Act
      const result = await adapter.collect();

      // Assert
      expect(result.references).toHaveLength(1);
      expect(result.references[0].id).toBe("H05-02");
      expect(result.matrixError).toBeNull();
      expect(result.evidence.resolvableScopeIds.has("H05-02")).toBe(true);
    });

    it("testReferences を 1 件も持たない story-id は解決可能スコープに含めないこと", async () => {
      // Arrange
      await writeCoverageReport("x", "| AC-1 | 内容 | ✅ <!-- @attestation H09-01 --> |\n");
      await writeMatrix({
        stories: [{ storyId: "H09-01", storyMappings: [{ acId: "AC-1", testReferences: [] }] }],
      });
      const adapter = new FileSystemCoverageAttestationVerificationAdapter(rootDir);

      // Act
      const result = await adapter.collect();

      // Assert
      expect(result.matrixError).toBeNull();
      expect(result.evidence.resolvableScopeIds.has("H09-01")).toBe(false);
    });

    it("ungated-legacy マーカー付きファイルの参照は収集しないこと（免除）", async () => {
      // Arrange
      await writeCoverageReport(
        "legacy",
        "<!-- @coverage-gating: ungated-legacy -->\n| AC-1 | ✅ <!-- @attestation GHOST --> |\n",
      );
      const adapter = new FileSystemCoverageAttestationVerificationAdapter(rootDir);

      // Act
      const result = await adapter.collect();

      // Assert — 参照 0 件ゆえ matrix も読みに行かない
      expect(result.references).toHaveLength(0);
      expect(result.matrixError).toBeNull();
    });

    it("参照が 1 件も無ければ matrix を読まず matrixError=null を返すこと", async () => {
      // Arrange — matrix ファイルは存在しない
      await writeCoverageReport("x", "# タイトル\n本文（✅ も @attestation も無し）\n");
      const adapter = new FileSystemCoverageAttestationVerificationAdapter(rootDir);

      // Act
      const result = await adapter.collect();

      // Assert
      expect(result.references).toHaveLength(0);
      expect(result.matrixError).toBeNull();
    });

    it("参照ありで matrix が読めない場合は matrixError を返すこと（fail-closed）", async () => {
      // Arrange — matrix ファイルを作らない
      await writeCoverageReport("x", "| AC-1 | ✅ <!-- @attestation H05-02 --> |\n");
      const adapter = new FileSystemCoverageAttestationVerificationAdapter(rootDir);

      // Act
      const result = await adapter.collect();

      // Assert
      expect(result.references).toHaveLength(1);
      expect(result.matrixError).not.toBeNull();
      expect(result.matrixError).toContain("fail-closed");
    });

    it("1 行に複数の @attestation 参照があればすべて抽出すること", async () => {
      // Arrange
      await writeCoverageReport("x", "✅ <!-- @attestation A --> ✅ <!-- @attestation B -->\n");
      await writeMatrix({
        stories: [
          { storyId: "A", storyMappings: [{ testReferences: [{ filePath: "a.test.ts" }] }] },
          { storyId: "B", storyMappings: [{ testReferences: [{ filePath: "b.test.ts" }] }] },
        ],
      });
      const adapter = new FileSystemCoverageAttestationVerificationAdapter(rootDir);

      // Act
      const result = await adapter.collect();

      // Assert
      expect(result.references.map((r) => r.id).sort()).toEqual(["A", "B"]);
    });
  });
});
