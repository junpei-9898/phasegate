// @unit phase-dependency-model
// @layer infrastructure
// @story WI-251
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { FileSystemStoryReflectionAdapter } from "../../../phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js";
import { context, target } from "../../helpers/test-helpers.ts";

const UNIT = "validator-system";
const DOMAIN_DIR = `scripts/harness/${UNIT}/domain`;

let rootDir: string;

function git(args: readonly string[]): void {
  execFileSync("git", args, { cwd: rootDir });
}

async function writeSource(relativePath: string, content: string): Promise<void> {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

function commitAll(trailerWorkItems: readonly string[]): void {
  git(["add", "-A"]);
  const trailers = trailerWorkItems.map((wi) => `Work-Item: ${wi}`).join("\n");
  git(["commit", "-q", "-m", `batch change\n\n${trailers}`]);
}

target("FileSystemStoryReflectionAdapter batch attribution (WI-251)", () => {
  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(tmpdir(), "story-reflection-batch-"));
    git(["init", "-q"]);
    git(["config", "user.email", "test@example.com"]);
    git(["config", "user.name", "Test"]);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  context("複数WI trailerコミットのdomainファイル帰属", () => {
    it("他WIタグのみのdomainファイルは自WIに帰属しない", async () => {
      // Arrange — 2 WI trailer のバッチコミットが、WI-117 タグのみを持つ domain ファイルを変更する
      await writeSource(
        `${DOMAIN_DIR}/drift-detection-service.ts`,
        "/**\n * @layer domain\n * @unit validator-system\n * @work-item-id WI-117\n */\nexport const x = 1;\n",
      );
      commitAll(["WI-117", "WI-125"]);
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.storyTouchesUnitLayer("WI-125", UNIT, "domain");

      // Assert
      expect(actual).toBe(false);
    });

    it("自WIタグを含むdomainファイルは帰属する", async () => {
      // Arrange — 2 WI trailer のバッチコミットが、WI-117 タグを持つ domain ファイルを変更する
      await writeSource(
        `${DOMAIN_DIR}/drift-detection-service.ts`,
        "/**\n * @layer domain\n * @unit validator-system\n * @work-item-id WI-117\n */\nexport const x = 1;\n",
      );
      commitAll(["WI-117", "WI-125"]);
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.storyTouchesUnitLayer("WI-117", UNIT, "domain");

      // Assert
      expect(actual).toBe(true);
    });

    it("タグ無しdomainファイルはfail-closedで帰属する", async () => {
      // Arrange — 2 WI trailer のバッチコミットが、帰属タグを持たない domain ファイルを変更する
      await writeSource(
        `${DOMAIN_DIR}/untagged-service.ts`,
        "// @layer domain\n// @unit validator-system\nexport const y = 2;\n",
      );
      commitAll(["WI-117", "WI-125"]);
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.storyTouchesUnitLayer("WI-125", UNIT, "domain");

      // Assert
      expect(actual).toBe(true);
    });

    it("@story書式のタグも帰属判定に用いられる", async () => {
      // Arrange — @story 書式で WI-131 を宣言した domain ファイルを 2 WI trailer で変更する
      await writeSource(
        `${DOMAIN_DIR}/story-tagged-service.ts`,
        "// @layer domain\n// @unit validator-system\n// @story WI-131\nexport const z = 3;\n",
      );
      commitAll(["WI-125", "WI-131"]);
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const touchedByOwner = await adapter.storyTouchesUnitLayer("WI-131", UNIT, "domain");
      const touchedByOther = await adapter.storyTouchesUnitLayer("WI-125", UNIT, "domain");

      // Assert
      expect(touchedByOwner).toBe(true);
      expect(touchedByOther).toBe(false);
    });
  });

  context("単一WI trailerコミットの帰属", () => {
    it("単一WI trailerコミットは従来どおり全changed pathを帰属する", async () => {
      // Arrange — 単一 WI trailer のコミットが、別 WI タグを持つ domain ファイルを変更する
      await writeSource(
        `${DOMAIN_DIR}/drift-detection-service.ts`,
        "/**\n * @layer domain\n * @unit validator-system\n * @work-item-id WI-117\n */\nexport const x = 1;\n",
      );
      commitAll(["WI-125"]);
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.storyTouchesUnitLayer("WI-125", UNIT, "domain");

      // Assert
      expect(actual).toBe(true);
    });
  });
});
