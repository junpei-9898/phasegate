// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-148
// @work-item-id WI-210

import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInstallationModule } from "../../../installation/composition-root.js";
import { target } from "../../helpers/test-helpers.js";

let projectRoot: string | null = null;

async function createProjectRoot(): Promise<string> {
  projectRoot = await mkdtemp(join(tmpdir(), "phasegate-reconcile-"));
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

function hash(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

async function runInstall(root: string, version = "0.145.3") {
  return createInstallationModule().installHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    phasegateVersion: version,
    dryRun: false,
    apply: true,
    force: true,
    json: true,
  });
}

async function runReconcile(root: string, options: { apply?: boolean; force?: boolean; version?: string } = {}) {
  const actual = await createInstallationModule().reconcileHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    phasegateVersion: options.version ?? "0.146.0",
    dryRun: !options.apply,
    apply: options.apply ?? false,
    force: options.force ?? false,
    json: true,
  });
  return {
    ...actual,
    payload: JSON.parse(actual.stdout) as {
      plan: Array<{ path: string; action: string; repairMode: string; changed: boolean }>;
      refused: Array<{ path: string }>;
      backupDir: string | null;
    },
  };
}

async function updateManifestEntryHash(root: string, path: string, content: string): Promise<void> {
  const manifestPath = join(root, ".phasegate", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    entries: Array<{ path: string; hash: string }>;
  };
  const entry = manifest.entries.find((candidate) => candidate.path === path);
  if (entry === undefined) throw new Error(`missing manifest entry: ${path}`);
  entry.hash = hash(content);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function removeManifestEntry(root: string, path: string): Promise<void> {
  const manifestPath = join(root, ".phasegate", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    entries: Array<{ path: string }>;
  };
  manifest.entries = manifest.entries.filter((entry) => entry.path !== path);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function dryRunInstalledProject() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  const before = await readFile(join(root, "package.json"), "utf8");
  const result = await runReconcile(root);
  return {
    result,
    before,
    after: await readFile(join(root, "package.json"), "utf8"),
  };
}

async function dryRunSameVersionAfterInstall() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  return runReconcile(root, { version: "0.145.3" });
}

async function applyVersionReconcileAndReadPackage() {
  const root = await createProjectRoot();
  await writeProjectFile(root, "package.json", JSON.stringify({ scripts: { test: "vitest" }, devDependencies: { vitest: "^3.0.0" } }));
  await runInstall(root, "0.145.3");
  const result = await runReconcile(root, { apply: true, version: "0.146.0" });
  return {
    result,
    pkg: JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    },
  };
}

async function applyUnmodifiedCreatedEntryReconcile() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  const oldContent = "name: old phasegate workflow\n";
  await writeProjectFile(root, ".github/workflows/phasegate-aidlc-gate.yml", oldContent);
  await updateManifestEntryHash(root, ".github/workflows/phasegate-aidlc-gate.yml", oldContent);
  const result = await runReconcile(root, { apply: true });
  return {
    result,
    oldContent,
    actual: await readFile(join(root, ".github/workflows/phasegate-aidlc-gate.yml"), "utf8"),
  };
}

async function applyModifiedCreatedEntryWithoutForce() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  await writeProjectFile(root, ".github/workflows/phasegate-aidlc-gate.yml", "name: user modified\n");
  return runReconcile(root, { apply: true });
}

async function applyModifiedCreatedEntryWithForce() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  await writeProjectFile(root, ".github/workflows/phasegate-aidlc-gate.yml", "name: user modified\n");
  const result = await runReconcile(root, { apply: true, force: true });
  return {
    result,
    backup: await readFile(join(result.payload.backupDir ?? "", ".github/workflows/phasegate-aidlc-gate.yml"), "utf8"),
  };
}

async function applyMissingDeployTargetTwice() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  await rm(join(root, ".codex", "skills"), { recursive: true, force: true });
  await removeManifestEntry(root, ".codex/skills");
  const first = await runReconcile(root, { apply: true });
  const second = await runReconcile(root, { apply: true });
  return {
    first,
    second,
    actual: await fileExists(join(root, ".codex", "skills")),
  };
}

async function arrangeOldInstallWithEmptySharedSkillsAndRepair() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  await rm(join(root, "skills"), { recursive: true, force: true });
  await mkdir(join(root, "skills"), { recursive: true });
  await removeManifestEntry(root, "skills/.harness-version");
  const manifestPath = join(root, ".phasegate", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    entries: Array<{ path: string }>;
  };
  manifest.entries = manifest.entries.filter((entry) => !entry.path.startsWith("skills/"));
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const beforeDoctor = await createInstallationModule().doctorHandler.execute({
    projectRoot: root,
    strict: false,
    json: true,
    reportOut: null,
    phasegateVersion: "0.146.0",
    agent: "both",
  });
  const repaired = await runReconcile(root, { apply: true, version: "0.146.0" });
  const afterDoctor = await createInstallationModule().doctorHandler.execute({
    projectRoot: root,
    strict: false,
    json: true,
    reportOut: null,
    phasegateVersion: "0.146.0",
    agent: "both",
  });
  return {
    beforeDoctor: JSON.parse(beforeDoctor.stdout) as { findings: Array<{ checkId: string }> },
    repaired,
    afterDoctor: JSON.parse(afterDoctor.stdout) as { findings: Array<{ checkId: string }> },
    hasToolkitGuide: await fileExists(join(root, "skills", "phasegate-toolkit-guide", "SKILL.md")),
  };
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target("ReconcileHandler", () => {
  describe("manifest-driven reconcile", () => {
    it("dry-run は entry ごとの repairMode と diff を返し files を変化させないこと", async () => {
      // Act
      const actual = await dryRunInstalledProject();

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.result.payload.plan).toEqual(expect.arrayContaining([expect.objectContaining({ path: "package.json", repairMode: "mechanical" })]));
      expect(actual.after).toBe(actual.before);
    });

    it("install 直後の同一 version reconcile は created shell hooks を変更しないこと", async () => {
      // Act
      const actual = await dryRunSameVersionAfterInstall();

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.payload.plan.every((item) => !item.changed)).toBe(true);
    });

    it("apply は merged entry の PhaseGate 管理部分を更新し user 部分を保持すること", async () => {
      // Act
      const actual = await applyVersionReconcileAndReadPackage();

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.pkg.scripts.test).toBe("vitest");
      expect(actual.pkg.scripts["phasegate:doctor"]).toBe("phasegate doctor");
      expect(actual.pkg.devDependencies.vitest).toBe("^3.0.0");
      expect(actual.pkg.devDependencies.phasegate).toBe("^0.146.0");
    });

    it("created entry は user 改変なしなら current template に追従すること", async () => {
      // Act
      const actual = await applyUnmodifiedCreatedEntryReconcile();

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.actual).toContain("AIDLC Quality Gate");
      expect(actual.actual).not.toBe(actual.oldContent);
    });

    it("created entry の user 改変は force 無しで refuse すること", async () => {
      // Act
      const actual = await applyModifiedCreatedEntryWithoutForce();

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.payload.refused).toEqual(expect.arrayContaining([expect.objectContaining({ path: ".github/workflows/phasegate-aidlc-gate.yml" })]));
    });

    it("created entry の user 改変は force で backup して上書きすること", async () => {
      // Act
      const actual = await applyModifiedCreatedEntryWithForce();

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.result.payload.backupDir).toContain(".phasegate/backups/reconcile-");
      expect(actual.backup).toContain("user modified");
    });

    it("manifest に無い deploy target を追加し 2 回目は no-op になること", async () => {
      // Act
      const actual = await applyMissingDeployTargetTwice();

      // Assert
      expect(actual.first.exitCode).toBe(0);
      expect(actual.first.payload.plan).toEqual(expect.arrayContaining([expect.objectContaining({ path: ".codex/skills", action: "link" })]));
      expect(actual.actual).toBe(true);
      expect(actual.second.exitCode).toBe(0);
      expect(actual.second.payload.plan.every((item) => !item.changed)).toBe(true);
    });

    it("旧 install の空 shared skills を reconcile/update-skills 経路で修復すること", async () => {
      // Act
      const actual = await arrangeOldInstallWithEmptySharedSkillsAndRepair();

      // Assert
      expect(actual.beforeDoctor.findings.map((finding) => finding.checkId)).toEqual(
        expect.arrayContaining(["claude-skills-symlink", "codex-skills-symlink"]),
      );
      expect(actual.repaired.exitCode).toBe(0);
      expect(actual.repaired.payload.plan).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "skills", changed: true }),
      ]));
      expect(actual.hasToolkitGuide).toBe(true);
      expect(actual.afterDoctor.findings.map((finding) => finding.checkId)).not.toContain("claude-skills-symlink");
      expect(actual.afterDoctor.findings.map((finding) => finding.checkId)).not.toContain("codex-skills-symlink");
    });
  });
});
