/**
 * @layer test
 * @unit validator-system
 * @story WI-258
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemCoverageAttestationGatingAdapter } from "../../../validator-system/infrastructure/adapters/file-system-coverage-attestation-gating-adapter.js";

let rootDir: string;

async function writeCoverageReport(unit: string, content: string): Promise<void> {
  const dir = path.join(rootDir, "docs", "product", "construction", unit);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "coverage_report.md"), content, "utf-8");
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "coverage-gating-adapter-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("FileSystemCoverageAttestationGatingAdapter", () => {
  describe("collect() — coverage_report 走査（WI-258）", () => {
    it("同一行に @attestation 参照のある ✅ は hasAttestationRef=true になること", async () => {
      // Arrange
      await writeCoverageReport("x", "| AC-1 | 内容 | test | ✅ カバー済み <!-- @attestation sha256:abc --> |\n");
      const adapter = new FileSystemCoverageAttestationGatingAdapter(rootDir);

      // Act
      const models = await adapter.collect();

      // Assert
      expect(models).toHaveLength(1);
      expect(models[0].hasLegacyMarker).toBe(false);
      expect(models[0].claims).toHaveLength(1);
      expect(models[0].claims[0].hasAttestationRef).toBe(true);
    });

    it("直前の連続コメント行に @attestation 参照があれば hasAttestationRef=true になること", async () => {
      // Arrange
      await writeCoverageReport("x", "<!-- @attestation sha256:def -->\n| AC-1 | 内容 | test | ✅ |\n");
      const adapter = new FileSystemCoverageAttestationGatingAdapter(rootDir);

      // Act
      const models = await adapter.collect();

      // Assert
      expect(models[0].claims[0].hasAttestationRef).toBe(true);
    });

    it("参照の無い ✅ は hasAttestationRef=false になること", async () => {
      // Arrange
      await writeCoverageReport("x", "| AC-1 | 内容 | test | ✅ カバー済み |\n");
      const adapter = new FileSystemCoverageAttestationGatingAdapter(rootDir);

      // Act
      const models = await adapter.collect();

      // Assert
      expect(models[0].claims[0].hasAttestationRef).toBe(false);
    });

    it("ungated-legacy マーカーを検出すること", async () => {
      // Arrange
      await writeCoverageReport("legacy", "<!-- @coverage-gating: ungated-legacy -->\n| AC-1 | 内容 | test | ✅ |\n");
      const adapter = new FileSystemCoverageAttestationGatingAdapter(rootDir);

      // Act
      const models = await adapter.collect();

      // Assert
      expect(models[0].hasLegacyMarker).toBe(true);
    });

    it("✅ を含まないファイルは claims 空で返されること", async () => {
      // Arrange
      await writeCoverageReport("empty", "# タイトル\n本文\n");
      const adapter = new FileSystemCoverageAttestationGatingAdapter(rootDir);

      // Act
      const models = await adapter.collect();

      // Assert
      expect(models[0].claims).toHaveLength(0);
    });

    it("construction ディレクトリが存在しない場合は空配列を返すこと", async () => {
      // Arrange
      const adapter = new FileSystemCoverageAttestationGatingAdapter(rootDir);

      // Act
      const models = await adapter.collect();

      // Assert
      expect(models).toEqual([]);
    });
  });
});
