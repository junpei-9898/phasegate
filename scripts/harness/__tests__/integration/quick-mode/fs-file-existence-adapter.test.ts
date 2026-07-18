// @layer test
// @unit quick-mode
// @work-item-id WI-334
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { FsFileExistenceAdapter } from "../../../quick-mode/infrastructure/adapters/fs-file-existence-adapter.js";
import { target } from "../../helpers/test-helpers.js";

target("FsFileExistenceAdapter", () => {
  target("exists", () => {
    describe("baseDir 基準のファイル存在チェック", () => {
      // IT-FFE-001（WI-334）
      it("baseDir 配下に実在する相対パスに対して true が返ること", async () => {
        // Arrange
        const baseDir = mkdtempSync(path.join(tmpdir(), "phasegate-ffe-"));
        writeFileSync(path.join(baseDir, "existing.txt"), "x\n", "utf8");
        const sut = new FsFileExistenceAdapter(baseDir);
        // Act
        const actual = await sut.exists("existing.txt");
        // Assert
        expect(actual).toBe(true);
      });

      // IT-FFE-002（WI-334）
      it("baseDir 配下に存在しない相対パスに対して false が返ること", async () => {
        // Arrange
        const baseDir = mkdtempSync(path.join(tmpdir(), "phasegate-ffe-"));
        const sut = new FsFileExistenceAdapter(baseDir);
        // Act
        const actual = await sut.exists(".github/workflows/not-created-yet.yml");
        // Assert
        expect(actual).toBe(false);
      });

      // IT-FFE-003（WI-334）
      it("絶対パスが渡された場合に baseDir と無関係に存在判定されること", async () => {
        // Arrange
        const baseDir = mkdtempSync(path.join(tmpdir(), "phasegate-ffe-"));
        const otherDir = mkdtempSync(path.join(tmpdir(), "phasegate-ffe-abs-"));
        const absolutePath = path.join(otherDir, "absolute.txt");
        writeFileSync(absolutePath, "x\n", "utf8");
        const sut = new FsFileExistenceAdapter(baseDir);
        // Act
        const actual = await sut.exists(absolutePath);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
