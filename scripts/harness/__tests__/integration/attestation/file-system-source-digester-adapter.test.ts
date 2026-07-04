// @unit attestation
// @layer test
// @story H16-02

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, expect, it } from "vitest";
import { FileSystemSourceDigesterAdapter } from "../../../attestation/infrastructure/adapters/file-system-source-digester-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

let tmpDirs: string[] = [];

const createTmpDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "attest-src-digester-"));
  tmpDirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

target("FileSystemSourceDigesterAdapter", () => {
  context("実在するファイルの相対パスを渡した場合", () => {
    it("ファイル内容の sha256 Digest を返すこと", async () => {
      // Arrange
      const dir = createTmpDir();
      const content = "line1\nline2\n";
      fs.writeFileSync(path.join(dir, "config.json"), content);
      const expectedHex = createHash("sha256").update(Buffer.from(content)).digest("hex");
      const adapter = new FileSystemSourceDigesterAdapter(dir);

      // Act
      const digest = await adapter.digestFile("config.json");

      // Assert
      expect(digest.value).toBe(`sha256:${expectedHex}`);
    });
  });

  context("絶対パスを渡した場合", () => {
    it("baseDir を無視して絶対パスの内容を hash すること", async () => {
      // Arrange
      const dir = createTmpDir();
      const abs = path.join(dir, "abs.txt");
      fs.writeFileSync(abs, "absolute-content");
      const expectedHex = createHash("sha256").update(Buffer.from("absolute-content")).digest("hex");
      const adapter = new FileSystemSourceDigesterAdapter("/nonexistent-base");

      // Act
      const digest = await adapter.digestFile(abs);

      // Assert
      expect(digest.value).toBe(`sha256:${expectedHex}`);
    });
  });

  context("存在しないファイルを渡した場合", () => {
    it("readFile 由来のエラーを throw すること（クラッシュではなく usecase が捕捉可能）", async () => {
      // Arrange
      const dir = createTmpDir();
      const adapter = new FileSystemSourceDigesterAdapter(dir);

      // Act & Assert
      await expect(adapter.digestFile("does-not-exist.json")).rejects.toThrow();
    });
  });
});
