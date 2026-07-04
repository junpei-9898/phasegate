// @unit phase-dependency-model
// @layer infrastructure
// @story H02-05
// @work-item-id WI-115
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { FileSystemStoryReflectionAdapter } from "../../../phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js";
import { context, target } from "../../helpers/test-helpers.ts";

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "story-reflection-adapter-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

target("FileSystemStoryReflectionAdapter#listStoryDirectories", () => {
  context("inception/{unit}/ 配下に storyId ディレクトリが複数ある場合", () => {
    it("ディレクトリ名一覧を返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/US-001"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/US-002"), { recursive: true });
      await writeFile(path.join(rootDir, "docs/inception/order/README.md"), "# ignore");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories("order");

      // Assert
      expect([...result].sort()).toEqual(["US-001", "US-002"]);
    });
  });

  context("inception/{unit}/ が存在しない場合", () => {
    it("空配列を返す", async () => {
      // Arrange
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories("missing");

      // Assert
      expect(result).toEqual([]);
    });
  });

  context("_shared ディレクトリは除外する", () => {
    it("_shared / _* / . で始まるディレクトリは含まない", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/_shared"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/.cache"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/US-001"), { recursive: true });
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories("order");

      // Assert
      expect([...result]).toEqual(["US-001"]);
    });
  });

  context("WI layout のディレクトリが存在する場合 (WI-026 G2-5 後: legacy issues 分岐廃止)", () => {
    it("unit-owned WI / 既存 H- ID と cross WI を reflection 対象IDとして返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/WI-001"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/H02-05"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/_cross/WI-026"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/_cross/memo"), { recursive: true });
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories("order");

      // Assert
      expect([...result]).toEqual(["H02-05", "WI-001", "WI-026"]);
    });
  });
});
