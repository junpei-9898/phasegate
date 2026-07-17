// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-148
// @work-item-id WI-210
// @work-item-id WI-216
// @work-item-id WI-219
// @work-item-id WI-315

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

async function runPersonalInstall(root: string, agent: "claude" | "codex", version = "0.145.3") {
  return createInstallationModule().installHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    phasegateVersion: version,
    dryRun: false,
    apply: true,
    force: true,
    json: true,
    personal: true,
    agent,
    includeClaude: agent === "claude",
    includeCodex: agent === "codex",
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
  await writeProjectFile(
    root,
    "package.json",
    JSON.stringify({ scripts: { test: "vitest" }, devDependencies: { vitest: "^3.0.0" } }),
  );
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

async function arrangeReconcileWithDelegationDisabledRepair() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  const configPath = join(root, "phasegate.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>;
  config.modelRouting = { delegation: "none" };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await rm(join(root, "skills", "it-test-designer"), { recursive: true, force: true });
  const repaired = await runReconcile(root, { apply: true, version: "0.146.0" });
  return {
    repaired,
    skill: await readFile(join(root, "skills", "it-test-designer", "SKILL.md"), "utf8"),
  };
}

async function arrangeReconcileWithDelegationPolicyChange() {
  const root = await createProjectRoot();
  await runInstall(root, "0.146.0");
  const configPath = join(root, "phasegate.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>;
  config.modelRouting = { delegation: "none" };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const repaired = await runReconcile(root, { apply: true, version: "0.146.0" });
  return {
    repaired,
    skill: await readFile(join(root, "skills", "it-test-designer", "SKILL.md"), "utf8"),
  };
}

async function arrangePersonalInstallWithDeletedBundledSkillAndRepair() {
  const root = await createProjectRoot();
  await runPersonalInstall(root, "codex", "0.145.3");
  await writeProjectFile(root, ".codex/skills/user-owned/SKILL.md", "# User Owned\n");
  await rm(join(root, ".codex/skills/phasegate-toolkit-guide"), { recursive: true, force: true });
  const repaired = await runReconcile(root, { apply: true, version: "0.146.0" });
  return {
    repaired,
    hasToolkitGuide: await fileExists(join(root, ".codex/skills/phasegate-toolkit-guide/SKILL.md")),
    userOwned: await readFile(join(root, ".codex/skills/user-owned/SKILL.md"), "utf8"),
  };
}

async function arrangeCustomizedClaudeMdUserSectionReconcile() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  const installed = await readFile(join(root, "CLAUDE.md"), "utf8");
  // user-section の placeholder をユーザー記述に置き換えてから version bump reconcile する。
  const customized = installed.replace("Project-specific agent instructions go here.", "常に日本語で回答すること。");
  await writeProjectFile(root, "CLAUDE.md", customized);
  await updateManifestEntryHash(root, "CLAUDE.md", customized);
  const result = await runReconcile(root, { apply: true, version: "0.146.0" });
  return {
    result,
    content: await readFile(join(root, "CLAUDE.md"), "utf8"),
  };
}

async function addManifestSkillEntry(root: string, path: string): Promise<void> {
  const manifestPath = join(root, ".phasegate", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    entries: Array<{ path: string; mode: string; block: null; hash: string; deployedAt: string }>;
  };
  manifest.entries.push({
    path,
    mode: "created",
    block: null,
    hash: hash("orphan"),
    deployedAt: new Date().toISOString(),
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function readManifestPaths(root: string): Promise<string[]> {
  const manifestPath = join(root, ".phasegate", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    entries: Array<{ path: string }>;
  };
  return manifest.entries.map((entry) => entry.path);
}

async function arrangeSharedInstallWithOrphanSkillAndPrune() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  await writeProjectFile(root, "skills/legacy-orphan/SKILL.md", "# Legacy Orphan\n");
  await addManifestSkillEntry(root, "skills/legacy-orphan");
  await writeProjectFile(root, "skills/user-owned/SKILL.md", "# User Owned\n");
  const dryRun = await runReconcile(root, { version: "0.145.3" });
  const dryRunOrphanExists = await fileExists(join(root, "skills", "legacy-orphan"));
  const applied = await runReconcile(root, { apply: true, version: "0.145.3" });
  return {
    dryRun,
    dryRunOrphanExists,
    applied,
    orphanOnDisk: await fileExists(join(root, "skills", "legacy-orphan")),
    orphanInManifest: (await readManifestPaths(root)).includes("skills/legacy-orphan"),
    userOwnedOnDisk: await fileExists(join(root, "skills", "user-owned", "SKILL.md")),
    harnessVersionInManifest: (await readManifestPaths(root)).includes("skills/.harness-version"),
    keptSkillOnDisk: await fileExists(join(root, "skills", "codebase-mapper", "SKILL.md")),
  };
}

async function arrangePersonalInstallWithOrphanSkillAndPrune() {
  const root = await createProjectRoot();
  await runPersonalInstall(root, "codex", "0.145.3");
  await writeProjectFile(root, ".codex/skills/legacy-orphan/SKILL.md", "# Legacy Orphan\n");
  await addManifestSkillEntry(root, ".codex/skills/legacy-orphan");
  await writeProjectFile(root, ".codex/skills/user-owned/SKILL.md", "# User Owned\n");
  const applied = await runReconcile(root, { apply: true, version: "0.145.3" });
  return {
    applied,
    orphanOnDisk: await fileExists(join(root, ".codex/skills/legacy-orphan")),
    orphanInManifest: (await readManifestPaths(root)).includes(".codex/skills/legacy-orphan"),
    userOwnedOnDisk: await fileExists(join(root, ".codex/skills/user-owned/SKILL.md")),
  };
}

async function arrangeOrphanPruneIdempotency() {
  const root = await createProjectRoot();
  await runInstall(root, "0.145.3");
  await writeProjectFile(root, "skills/legacy-orphan/SKILL.md", "# Legacy Orphan\n");
  await addManifestSkillEntry(root, "skills/legacy-orphan");
  const first = await runReconcile(root, { apply: true, version: "0.145.3" });
  const second = await runReconcile(root, { apply: true, version: "0.145.3" });
  return { first, second };
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
      expect(actual.result.payload.plan).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "package.json", repairMode: "mechanical" })]),
      );
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
      expect(actual.payload.refused).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ".github/workflows/phasegate-aidlc-gate.yml" })]),
      );
    });

    it("created entry の user 改変は force で backup して上書きすること", async () => {
      // Act
      const actual = await applyModifiedCreatedEntryWithForce();

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.result.payload.backupDir).toContain(".phasegate/backups/reconcile-");
      expect(actual.backup).toContain("user modified");
    });

    it("apply は CLAUDE.md の managed section を更新しつつ user-section 記述を保持すること", async () => {
      // Act
      const actual = await arrangeCustomizedClaudeMdUserSectionReconcile();

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.content).toContain("常に日本語で回答すること。");
      expect(actual.content).not.toContain("Project-specific agent instructions go here.");
      expect(actual.content).toContain("<!-- phasegate:user-section:start -->");
      expect(actual.content).toContain("<!-- phasegate:user-section:end -->");
    });

    it("manifest に無い deploy target を追加し 2 回目は no-op になること", async () => {
      // Act
      const actual = await applyMissingDeployTargetTwice();

      // Assert
      expect(actual.first.exitCode).toBe(0);
      expect(actual.first.payload.plan).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ".codex/skills", action: "link" })]),
      );
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
      expect(actual.repaired.payload.plan).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "skills", changed: true })]),
      );
      expect(actual.hasToolkitGuide).toBe(true);
      expect(actual.afterDoctor.findings.map((finding) => finding.checkId)).not.toContain("claude-skills-symlink");
      expect(actual.afterDoctor.findings.map((finding) => finding.checkId)).not.toContain("codex-skills-symlink");
    });

    it("modelRouting.delegation=none の reconcile 修復は固定委任を復元しないこと", async () => {
      // Act
      const actual = await arrangeReconcileWithDelegationDisabledRepair();

      // Assert
      expect(actual.repaired.exitCode).toBe(0);
      expect(actual.skill).not.toContain("model: sonnet");
      expect(actual.skill).not.toContain("review: opus");
      expect(actual.skill).not.toContain("delegate-sonnet");
      expect(actual.skill).toContain("メインセッションが成果物を生成する");
    });

    it("modelRouting.delegation 変更後の reconcile は同一 version の shared skill を再描画すること", async () => {
      // Act
      const actual = await arrangeReconcileWithDelegationPolicyChange();

      // Assert
      expect(actual.repaired.exitCode).toBe(0);
      expect(actual.repaired.payload.plan).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "skills", changed: true })]),
      );
      expect(actual.skill).not.toContain("model: sonnet");
      expect(actual.skill).not.toContain("review: opus");
      expect(actual.skill).not.toContain("delegate-sonnet");
      expect(actual.skill).toContain("メインセッションが成果物を生成する");
    });

    it("personal install の missing bundled skill を reconcile/update-skills 経路で修復し user-owned skill を保持すること", async () => {
      // Act
      const actual = await arrangePersonalInstallWithDeletedBundledSkillAndRepair();

      // Assert
      expect(actual.repaired.exitCode).toBe(0);
      expect(actual.repaired.payload.plan).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ".codex/skills", changed: true })]),
      );
      expect(actual.hasToolkitGuide).toBe(true);
      expect(actual.userOwned).toBe("# User Owned\n");
    });
  });

  describe("orphan skill prune", () => {
    it("shared install の manifest 管理 orphan skill を apply で on-disk・manifest ともに prune すること", async () => {
      // Act
      const actual = await arrangeSharedInstallWithOrphanSkillAndPrune();

      // Assert
      expect(actual.dryRun.exitCode).toBe(0);
      expect(actual.dryRun.payload.plan).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "skills/legacy-orphan", action: "prune" })]),
      );
      expect(actual.dryRunOrphanExists).toBe(true);
      expect(actual.applied.exitCode).toBe(0);
      expect(actual.orphanOnDisk).toBe(false);
      expect(actual.orphanInManifest).toBe(false);
    });

    it("prune は manifest 外の user-owned skill・.harness-version・現行 bundled skill を保持すること", async () => {
      // Act
      const actual = await arrangeSharedInstallWithOrphanSkillAndPrune();

      // Assert
      expect(actual.userOwnedOnDisk).toBe(true);
      expect(actual.harnessVersionInManifest).toBe(true);
      expect(actual.keptSkillOnDisk).toBe(true);
    });

    it("personal install の manifest 管理 orphan skill を prune し user-owned skill を保持すること", async () => {
      // Act
      const actual = await arrangePersonalInstallWithOrphanSkillAndPrune();

      // Assert
      expect(actual.applied.exitCode).toBe(0);
      expect(actual.applied.payload.plan).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ".codex/skills/legacy-orphan", action: "prune" })]),
      );
      expect(actual.orphanOnDisk).toBe(false);
      expect(actual.orphanInManifest).toBe(false);
      expect(actual.userOwnedOnDisk).toBe(true);
    });

    it("orphan の無い reconcile は prune plan item を生成しないこと", async () => {
      // Act
      const actual = await dryRunSameVersionAfterInstall();

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.payload.plan.some((item) => item.action === "prune")).toBe(false);
    });

    it("orphan prune は idempotent で 2 回目は prune plan item を生成しないこと", async () => {
      // Act
      const actual = await arrangeOrphanPruneIdempotency();

      // Assert
      expect(actual.first.exitCode).toBe(0);
      expect(actual.first.payload.plan.some((item) => item.action === "prune")).toBe(true);
      expect(actual.second.exitCode).toBe(0);
      expect(actual.second.payload.plan.some((item) => item.action === "prune")).toBe(false);
    });
  });
});
