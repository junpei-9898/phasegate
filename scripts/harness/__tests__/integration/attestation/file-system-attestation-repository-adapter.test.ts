// @unit attestation
// @layer test
// @story H16-01

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, expect, it } from "vitest";
import type { AttestationDocument } from "../../../attestation/application/dto/attestation-document.js";
import { FileSystemAttestationRepositoryAdapter } from "../../../attestation/infrastructure/adapters/file-system-attestation-repository-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

let tmpDirs: string[] = [];

const createTmpDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "attest-repo-"));
  tmpDirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

const sampleDoc = (): AttestationDocument => ({
  schemaVersion: "phasegate-attestation/v1",
  predicateType: "https://phasegate.dev/attestation/gate-run/v1",
  subject: {
    command: "phasegate:ci-check",
    gateResult: "pass",
    validatorSet: [{ validatorId: "L3-004", passed: true, skipped: false }],
  },
  inputs: {
    digestAlgorithm: "sha256",
    sources: [{ path: "phasegate.config.json", digest: `sha256:${"a".repeat(64)}` }],
    inputDigest: `sha256:${"b".repeat(64)}`,
  },
  granularity: {
    traceability: { validator: "L3-004", level: "file", claim: "x", knownLimitations: ["y"] },
  },
  acBoundScope: [],
  metadata: { producedAt: "2026-07-05T00:00:00.000Z", producer: "phasegate-attestation/9.9.9", gitCommit: null },
  signature: {
    mode: "unsigned-poc",
    attestationDigest: `sha256:${"c".repeat(64)}`,
    algorithm: null,
    keyId: null,
    value: null,
  },
});

target("FileSystemAttestationRepositoryAdapter", () => {
  context("write で存在しないサブディレクトリ配下に書く場合", () => {
    it("親ディレクトリを作成し 2スペース整形 JSON + 改行で書き出すこと", async () => {
      // Arrange
      const dir = createTmpDir();
      const adapter = new FileSystemAttestationRepositoryAdapter(dir);
      const doc = sampleDoc();
      const outPath = ".harness/attestation.json";

      // Act
      await adapter.write(outPath, doc);

      // Assert
      const written = fs.readFileSync(path.join(dir, outPath), "utf8");
      expect(written.endsWith("\n")).toBe(true);
      expect(written).toBe(`${JSON.stringify(doc, null, 2)}\n`);
      // 2スペース整形の証跡（ネストが 2/4 スペースで開始）
      expect(written).toContain('\n  "schemaVersion"');
      expect(written).toContain('\n    "command"');
    });
  });

  context("write 後に read する場合", () => {
    it("書いた内容を parse 済み plain object として復元できること", async () => {
      // Arrange
      const dir = createTmpDir();
      const adapter = new FileSystemAttestationRepositoryAdapter(dir);
      const doc = sampleDoc();
      await adapter.write("attestation.json", doc);

      // Act
      const restored = await adapter.read("attestation.json");

      // Assert
      expect(restored).toEqual(doc);
    });
  });

  context("存在しないファイルを read する場合", () => {
    it("エラーを throw すること（usecase が exitCode 2 に変換する）", async () => {
      // Arrange
      const dir = createTmpDir();
      const adapter = new FileSystemAttestationRepositoryAdapter(dir);

      // Act & Assert
      await expect(adapter.read("missing.json")).rejects.toThrow();
    });
  });

  context("malformed JSON を read する場合", () => {
    it("JSON.parse のエラーを throw すること", async () => {
      // Arrange
      const dir = createTmpDir();
      fs.writeFileSync(path.join(dir, "broken.json"), "{ not valid json ");
      const adapter = new FileSystemAttestationRepositoryAdapter(dir);

      // Act & Assert
      await expect(adapter.read("broken.json")).rejects.toThrow();
    });
  });
});
