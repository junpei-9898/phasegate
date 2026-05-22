// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-147
// @work-item-id WI-199
// @work-item-id WI-207
// @work-item-id WI-208
// @work-item-id WI-209
// @work-item-id WI-210

import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInstallationModule } from "../../../installation/composition-root.js";
import { target } from "../../helpers/test-helpers.js";

let projectRoot: string | null = null;

async function createProjectRoot(): Promise<string> {
  projectRoot = await mkdtemp(join(tmpdir(), "phasegate-uninstall-"));
  return projectRoot;
}

async function writeProjectFile(root: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = join(root, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runInstall(root: string, options: { personal?: boolean; agent?: "claude" | "codex" | "both" } = {}) {
  const mod = createInstallationModule();
  const agent = options.agent ?? "both";
  return mod.installHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    phasegateVersion: "0.145.2",
    dryRun: false,
    apply: true,
    force: false,
    json: true,
    personal: options.personal ?? false,
    agent,
    includeClaude: agent === "claude" || agent === "both",
    includeCodex: agent === "codex" || agent === "both",
  });
}

async function runUninstall(root: string, options: { apply?: boolean; force?: boolean } = {}) {
  const mod = createInstallationModule();
  const actual = await mod.uninstallHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    dryRun: !options.apply,
    apply: options.apply ?? false,
    force: options.force ?? false,
    json: true,
  });
  return {
    ...actual,
    payload: JSON.parse(actual.stdout) as {
      plan: Array<{ path: string; action: string; repairMode: string; changed: boolean; protected: boolean }>;
      refused: Array<{ path: string; protected?: boolean }>;
      backupDir: string | null;
      archivedManifestPath: string | null;
    },
  };
}

async function arrangeInstalledProject() {
  const root = await createProjectRoot();
  await writeProjectFile(
    root,
    ".claude/settings.json",
    JSON.stringify({ hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: "custom stop" }] }] } }),
  );
  await writeProjectFile(root, ".husky/pre-commit", "echo custom pre-commit\n");
  const installed = await runInstall(root);
  expect(installed.exitCode).toBe(1);
  const forced = await createInstallationModule().installHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    phasegateVersion: "0.145.2",
    dryRun: false,
    apply: true,
    force: true,
    json: true,
  });
  expect(forced.exitCode).toBe(0);
  return root;
}

async function arrangeInstalledProjectWithModifiedWorkflow() {
  const root = await arrangeInstalledProject();
  await writeProjectFile(root, ".github/workflows/phasegate-aidlc-gate.yml", "name: user modified\n");
  return root;
}

async function arrangeInstalledProjectWithPackageLock() {
  const root = await arrangeInstalledProject();
  const packageLock = JSON.stringify({ name: "fixture", lockfileVersion: 3 }, null, 2) + "\n";
  await writeProjectFile(root, "package-lock.json", packageLock);
  await addManifestEntry(root, "package-lock.json", packageLock);
  return root;
}

async function addManifestEntry(root: string, relativePath: string, content: string): Promise<void> {
  const manifestPath = join(root, ".phasegate", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    entries: Array<Record<string, unknown>>;
  };
  manifest.entries.push({
    path: relativePath,
    mode: "merged",
    block: { start: "phasegate structured merge", end: "phasegate structured merge", content: `json:${relativePath}` },
    hash: `sha256:${createHash("sha256").update(content).digest("hex")}`,
    deployedAt: new Date().toISOString(),
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const TEAM_OWNED_FILES = [
  "package.json",
  "AGENTS.md",
  "CLAUDE.md",
  ".husky/pre-commit",
  ".husky/commit-msg",
  ".husky/pre-push",
  ".github/workflows/phasegate-aidlc-gate.yml",
  ".gitignore",
] as const;

async function snapshotFiles(root: string, paths: readonly string[]): Promise<Record<string, string>> {
  const entries: Array<[string, string]> = [];
  for (const path of paths) {
    entries.push([path, await readFile(join(root, path), "utf8")]);
  }
  return Object.fromEntries(entries);
}

async function arrangePersonalInstalledProject() {
  const root = await createProjectRoot();
  for (const path of TEAM_OWNED_FILES) {
    await writeProjectFile(root, path, `team-owned ${path}\n`);
  }
  await writeProjectFile(root, ".git/info/exclude", "# user local excludes\n");
  const before = await snapshotFiles(root, TEAM_OWNED_FILES);
  const installed = await runInstall(root, { personal: true, agent: "claude" });
  expect(installed.exitCode).toBe(0);
  return { root, before };
}

async function arrangeInstalledProjectWithUserOwnedSkill() {
  const root = await arrangeInstalledProject();
  await writeProjectFile(root, "skills/user-owned/SKILL.md", "# User Owned\n");
  return root;
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target("UninstallHandler", () => {
  describe("manifest-driven uninstall", () => {
    it("dry-run は manifest entries を列挙して files を変化させないこと", async () => {
      // Arrange
      const root = await arrangeInstalledProject();

      // Act
      const actual = await runUninstall(root);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.payload.plan.map((item) => item.path)).toEqual(
        expect.arrayContaining([".claude/settings.json", ".husky/pre-commit", "package.json", ".claude/skills"]),
      );
      expect(await fileExists(join(root, ".phasegate", "manifest.json"))).toBe(true);
      expect(await readFile(join(root, ".husky/pre-commit"), "utf8")).toContain("phasegate managed");
    });

    it("apply は created/symlink を削除し merged の user 部分を保持して manifest をarchiveすること", async () => {
      // Arrange
      const root = await arrangeInstalledProject();

      // Act
      const actual = await runUninstall(root, { apply: true, force: true });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.payload.archivedManifestPath).toContain("uninstalled-");
      expect(await fileExists(join(root, ".phasegate", "manifest.json"))).toBe(false);
      expect(await fileExists(join(root, ".github/workflows/phasegate-aidlc-gate.yml"))).toBe(false);
      expect(await fileExists(join(root, ".claude/skills"))).toBe(false);
      expect(await readFile(join(root, ".claude/settings.json"), "utf8")).toContain("custom stop");
      expect(await readFile(join(root, ".claude/settings.json"), "utf8")).not.toContain("npx phasegate hook stop");
      expect(await readFile(join(root, ".husky/pre-commit"), "utf8")).toContain("echo custom pre-commit");
      expect(await readFile(join(root, ".husky/pre-commit"), "utf8")).not.toContain("phasegate managed");
      expect(await readdir(join(root, ".phasegate"))).toEqual(expect.arrayContaining([expect.stringContaining("uninstalled-")]));
    });

    it("created entry の hash mismatch は force 無しで refuse して対象を残すこと", async () => {
      // Arrange
      const root = await arrangeInstalledProjectWithModifiedWorkflow();

      // Act
      const actual = await runUninstall(root, { apply: true });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.payload.refused).toEqual(expect.arrayContaining([expect.objectContaining({ path: ".github/workflows/phasegate-aidlc-gate.yml" })]));
      expect(await fileExists(join(root, ".github/workflows/phasegate-aidlc-gate.yml"))).toBe(true);
      expect(await fileExists(join(root, ".phasegate", "manifest.json"))).toBe(true);
    });

    it("protected file は dry-run JSON plan で machine-readable marker を返すこと", async () => {
      // Arrange
      const root = await arrangeInstalledProject();

      // Act
      const actual = await runUninstall(root);

      // Assert
      expect(actual.payload.plan).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "package.json", protected: true, changed: true }),
      ]));
    });

    it("package-lock.json candidate も protected marker を返すこと", async () => {
      // Arrange
      const root = await arrangeInstalledProjectWithPackageLock();

      // Act
      const actual = await runUninstall(root);

      // Assert
      expect(actual.payload.plan).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "package-lock.json", protected: true }),
      ]));
    });

    it("protected file mutation は force 無しの apply で refuse すること", async () => {
      // Arrange
      const root = await arrangeInstalledProject();

      // Act
      const actual = await runUninstall(root, { apply: true });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.payload.refused).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "package.json", protected: true }),
      ]));
      expect(await fileExists(join(root, ".phasegate", "manifest.json"))).toBe(true);
    });

    it("created entry の hash mismatch は force で backup して削除すること", async () => {
      // Arrange
      const root = await arrangeInstalledProjectWithModifiedWorkflow();

      // Act
      const actual = await runUninstall(root, { apply: true, force: true });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.payload.backupDir).toContain(".phasegate/backups/uninstall-");
      expect(await fileExists(join(root, ".github/workflows/phasegate-aidlc-gate.yml"))).toBe(false);
      expect(await readFile(join(actual.payload.backupDir ?? "", ".github/workflows/phasegate-aidlc-gate.yml"), "utf8")).toContain("user modified");
    });

    it("personal install の uninstall は personal artifact だけを削除して team-owned files を変化させないこと", async () => {
      // Arrange
      const { root, before } = await arrangePersonalInstalledProject();

      // Act
      const actual = await runUninstall(root, { apply: true });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.payload.plan.map((item) => item.path)).toEqual(
        expect.arrayContaining([
          ".phasegate-local/phasegate.config.json",
          ".claude/settings.json",
          ".claude/skills",
          ".git/info/exclude",
        ]),
      );
      expect(await fileExists(join(root, ".phasegate-local/phasegate.config.json"))).toBe(false);
      expect(await fileExists(join(root, ".claude/settings.json"))).toBe(false);
      expect(await fileExists(join(root, ".claude/skills"))).toBe(false);
      expect(await readFile(join(root, ".git/info/exclude"), "utf8")).toBe("# user local excludes\n");
      expect(await snapshotFiles(root, TEAM_OWNED_FILES)).toEqual(before);
    });

    it("project uninstall は managed shared skills だけを削除し user-owned skills を保持すること", async () => {
      // Arrange
      const root = await arrangeInstalledProjectWithUserOwnedSkill();

      // Act
      const actual = await runUninstall(root, { apply: true, force: true });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(await fileExists(join(root, "skills", "phasegate-toolkit-guide", "SKILL.md"))).toBe(false);
      expect(await readFile(join(root, "skills", "user-owned", "SKILL.md"), "utf8")).toBe("# User Owned\n");
      expect(await fileExists(join(root, ".claude", "skills"))).toBe(false);
      expect(await fileExists(join(root, ".codex", "skills"))).toBe(false);
    });
  });
});
