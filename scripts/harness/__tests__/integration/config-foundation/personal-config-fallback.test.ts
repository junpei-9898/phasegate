// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-208

import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileSystemConfigRepository } from "../../../config-foundation/infrastructure/repositories/file-system-config-repository.js";
import { target } from "../../helpers/test-helpers.js";
import { createValidSourceDocument } from "./config-foundation-test-fixtures.js";

let projectRoot: string | null = null;

async function createProjectRoot(): Promise<string> {
  projectRoot = await mkdtemp(path.join(tmpdir(), "phasegate-personal-config-"));
  return projectRoot;
}

async function writeJson(relativePath: string, document: unknown): Promise<void> {
  if (projectRoot === null) throw new Error("projectRoot is not initialized");
  const absolutePath = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

async function loadFromPersonalOnlyConfigProject() {
  const root = await createProjectRoot();
  const sut = new FileSystemConfigRepository();
  const expectedDocument = createValidSourceDocument({ project: { name: "personal-config", preset: "standard" } });
  const expectedConfigPath = path.join(root, ".phasegate-local", "phasegate.config.json");
  await writeJson(".phasegate-local/phasegate.config.json", expectedDocument);
  await mkdir(path.join(root, "sub", "sub2"), { recursive: true });
  const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(path.join(root, "sub", "sub2"));
  try {
    const loaded = await sut.load();
    return {
      loadedPath: await realpath(loaded.path),
      expectedPath: await realpath(expectedConfigPath),
      loadedDocument: loaded.document,
      expectedDocument,
    };
  } finally {
    cwdSpy.mockRestore();
  }
}

async function loadFromRootAndPersonalConfigProject() {
  const root = await createProjectRoot();
  const sut = new FileSystemConfigRepository();
  const expectedDocument = createValidSourceDocument({ project: { name: "root-config", preset: "standard" } });
  const personalDocument = createValidSourceDocument({ project: { name: "personal-config", preset: "standard" } });
  const expectedConfigPath = path.join(root, "phasegate.config.json");
  await writeJson("phasegate.config.json", expectedDocument);
  await writeJson(".phasegate-local/phasegate.config.json", personalDocument);
  const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(root);
  try {
    const loaded = await sut.load();
    return {
      loadedPath: await realpath(loaded.path),
      expectedPath: await realpath(expectedConfigPath),
      loadedDocument: loaded.document,
      expectedDocument,
    };
  } finally {
    cwdSpy.mockRestore();
  }
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target("FileSystemConfigRepository personal fallback", () => {
  describe("load", () => {
    it("IT-WI208-CFG-001: root config が無い場合は personal sandbox config を探索すること", async () => {
      // Arrange
      // Act
      const actual = await loadFromPersonalOnlyConfigProject();

      // Assert
      expect(actual.loadedPath).toBe(actual.expectedPath);
      expect(actual.loadedDocument).toEqual(actual.expectedDocument);
    });

    it("IT-WI208-CFG-002: root config が personal sandbox config より優先されること", async () => {
      // Arrange
      // Act
      const actual = await loadFromRootAndPersonalConfigProject();

      // Assert
      expect(actual.loadedPath).toBe(actual.expectedPath);
      expect(actual.loadedDocument).toEqual(actual.expectedDocument);
    });
  });
});
