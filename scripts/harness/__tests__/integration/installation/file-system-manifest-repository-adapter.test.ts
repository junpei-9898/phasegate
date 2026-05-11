// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145

import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DeploymentEntry } from "../../../installation/domain/deployment-entry.js";
import { DeploymentManifest } from "../../../installation/domain/deployment-manifest.js";
import { FileSystemManifestRepositoryAdapter } from "../../../installation/infrastructure/adapters/file-system-manifest-repository-adapter.js";
import { target, context } from "../../helpers/test-helpers.js";

const HASH = "sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";
let projectRoot: string | null = null;

async function createProjectRoot(): Promise<string> {
  projectRoot = await mkdtemp(join(tmpdir(), "phasegate-installation-"));
  return projectRoot;
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target("FileSystemManifestRepositoryAdapter", () => {
  describe("manifestを読み書きする", () => {
    it("manifestが存在しない場合はnullを返すこと", async () => {
      // Arrange
      const root = await createProjectRoot();
      const sut = new FileSystemManifestRepositoryAdapter();

      // Act
      const actual = await sut.load(root);

      // Assert
      expect(actual).toBeNull();
    });

    it("manifestをatomic pathに保存して読み戻せること", async () => {
      // Arrange
      const root = await createProjectRoot();
      const sut = new FileSystemManifestRepositoryAdapter();
      const manifest = DeploymentManifest.create("0.145.0", "2026-05-11T00:00:00.000Z").addEntry(
        DeploymentEntry.create({
          path: ".claude/settings.json",
          mode: "created",
          block: null,
          hash: HASH,
          deployedAt: "2026-05-11T00:00:00.000Z",
        }),
      );

      // Act
      await sut.save(root, manifest);
      const actual = await sut.load(root);
      const raw = await readFile(join(root, ".phasegate", "manifest.json"), "utf8");

      // Assert
      expect(actual?.findEntry(".claude/settings.json")?.hash.toString()).toBe(HASH);
      expect(raw).toContain("\"version\": \"0.145.0\"");
    });
  });

  context("manifest JSON が壊れている場合", () => {
    it("parse errorを返すこと", async () => {
      // Arrange
      const root = await createProjectRoot();
      await mkdir(join(root, ".phasegate"), { recursive: true });
      await writeFile(join(root, ".phasegate", "manifest.json"), "{ invalid", "utf8");
      const sut = new FileSystemManifestRepositoryAdapter();

      // Act
      const actual = () => sut.load(root);

      // Assert
      await expect(actual).rejects.toThrow("Failed to parse");
    });
  });
});
