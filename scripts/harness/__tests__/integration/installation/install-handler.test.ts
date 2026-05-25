// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-146
// @work-item-id WI-174
// @work-item-id WI-182
// @work-item-id WI-183
// @work-item-id WI-207
// @work-item-id WI-208
// @work-item-id WI-209
// @work-item-id WI-210
// @work-item-id WI-213
// @work-item-id WI-214
// @work-item-id WI-215
// @work-item-id WI-216

import { access, lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInstallationModule } from "../../../installation/composition-root.js";
import { target } from "../../helpers/test-helpers.js";

let projectRoot: string | null = null;

async function createProjectRoot(): Promise<string> {
  projectRoot = await mkdtemp(join(tmpdir(), "phasegate-install-"));
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

async function runInstall(root: string, options: { apply?: boolean; force?: boolean; personal?: boolean; agent?: "claude" | "codex" | "both"; skillSet?: "core" | "all" } = {}) {
  const mod = createInstallationModule();
  const agent = options.agent ?? "both";
  return mod.installHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    phasegateVersion: "0.145.1",
    dryRun: !options.apply,
    apply: options.apply ?? false,
    force: options.force ?? false,
    json: true,
    personal: options.personal ?? false,
    agent,
    skillSet: options.skillSet ?? "all",
    includeClaude: agent === "claude" || agent === "both",
    includeCodex: agent === "codex" || agent === "both",
  });
}

async function installAndReadJsonMerge(root: string) {
  const result = await runInstall(root, { apply: true });
  return {
    result,
    claude: await readFile(join(root, ".claude/settings.json"), "utf8"),
    codex: await readFile(join(root, ".codex/hooks.json"), "utf8"),
    config: await readFile(join(root, "phasegate.config.json"), "utf8"),
    manifest: JSON.parse(await readFile(join(root, ".phasegate", "manifest.json"), "utf8")) as {
      entries: Array<{ path: string; mode: string }>;
    },
  };
}

async function arrangeJsonMergeAndInstall() {
  const root = await createProjectRoot();
  await writeProjectFile(
    root,
    ".claude/settings.json",
    JSON.stringify({ hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: "custom stop" }] }] } }),
  );
  await writeProjectFile(
    root,
    ".codex/hooks.json",
    JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "custom" }] }] } }),
  );
  return installAndReadJsonMerge(root);
}

async function installTwiceAndReadIdempotency(root: string) {
  await runInstall(root, { apply: true });
  const firstManifest = await readFile(join(root, ".phasegate", "manifest.json"), "utf8");
  const firstPackage = await readFile(join(root, "package.json"), "utf8");
  const firstConfig = await readFile(join(root, "phasegate.config.json"), "utf8");
  const secondResult = await runInstall(root, { apply: true });
  return {
    secondResult,
    firstManifest,
    secondManifest: await readFile(join(root, ".phasegate", "manifest.json"), "utf8"),
    firstPackage,
    secondPackage: await readFile(join(root, "package.json"), "utf8"),
    firstConfig,
    secondConfig: await readFile(join(root, "phasegate.config.json"), "utf8"),
  };
}

async function arrangeAndReadIdempotency() {
  const root = await createProjectRoot();
  return installTwiceAndReadIdempotency(root);
}

async function refuseThenForceAndRead(root: string) {
  const refused = await runInstall(root, { apply: true });
  const forced = await runInstall(root, { apply: true, force: true });
  return {
    refused,
    forced,
    content: await readFile(join(root, ".husky/pre-commit"), "utf8"),
  };
}

async function arrangeCustomHuskyAndForce() {
  const root = await createProjectRoot();
  await writeProjectFile(root, ".husky/pre-commit", "echo custom\n");
  return refuseThenForceAndRead(root);
}

async function arrangeExistingAgentsMdInstallAndRead(): Promise<string> {
  const root = await createProjectRoot();
  await writeProjectFile(root, "AGENTS.md", "# Existing Agent Notes\n\nkeep user text\n");
  await runInstall(root, { apply: true });
  return await readFile(join(root, "AGENTS.md"), "utf8");
}

async function installAndReadDownstreamTemplates(root: string) {
  const result = await runInstall(root, { apply: true });
  return {
    result,
    preCommit: await readFile(join(root, ".husky/pre-commit"), "utf8"),
    aidlcGate: await readFile(join(root, ".github/workflows/phasegate-aidlc-gate.yml"), "utf8"),
  };
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

async function arrangeTeamOwnedFiles(root: string): Promise<Record<string, string>> {
  for (const path of TEAM_OWNED_FILES) {
    await writeProjectFile(root, path, `team-owned ${path}\n`);
  }
  await writeProjectFile(root, ".git/info/exclude", "# user local excludes\n");
  return snapshotFiles(root, TEAM_OWNED_FILES);
}

async function arrangePersonalClaudeDoctorResult() {
  const root = await createProjectRoot();
  await runInstall(root, { apply: true, personal: true, agent: "claude" });
  const doctor = await createInstallationModule().doctorHandler.execute({
    projectRoot: root,
    strict: false,
    json: true,
    reportOut: null,
    phasegateVersion: "0.145.1",
    agent: "claude",
  });
  return {
    exitCode: doctor.exitCode,
    payload: JSON.parse(doctor.stdout) as {
      scope: { installationMode: string };
      findings: Array<{ checkId: string }>;
      scopedOutFindings: Array<{ checkId: string; scopeReason: string }>;
    },
  };
}

async function arrangePersonalInstallWithExistingClaudeSettings() {
  const root = await createProjectRoot();
  await writeProjectFile(root, ".claude/settings.json", "{\"custom\": true}\n");
  const installed = await runInstall(root, { apply: true, personal: true, agent: "claude" });
  const parsed = JSON.parse(installed.stdout) as {
    plan: Array<{ path: string; changed: boolean; repairMode: string; summary: string }>;
  };
  return {
    exitCode: installed.exitCode,
    settingsPlan: parsed.plan.find((item) => item.path === ".claude/settings.json"),
    settingsContent: await readFile(join(root, ".claude/settings.json"), "utf8"),
  };
}

async function arrangePersonalInstallWithExistingCodexHooks() {
  const root = await createProjectRoot();
  await writeProjectFile(root, ".codex/hooks.json", "{\"custom\": true}\n");
  const installed = await runInstall(root, { apply: true, personal: true, agent: "codex" });
  const parsed = JSON.parse(installed.stdout) as {
    plan: Array<{ path: string; changed: boolean; repairMode: string; summary: string }>;
  };
  return {
    exitCode: installed.exitCode,
    hooksPlan: parsed.plan.find((item) => item.path === ".codex/hooks.json"),
    hooksContent: await readFile(join(root, ".codex/hooks.json"), "utf8"),
  };
}

async function arrangePersonalClaudeInstallWithExistingSkills() {
  const root = await createProjectRoot();
  await writeProjectFile(root, ".claude/skills/.harness-version", "{\"version\":\"0.1.0\"}\n");
  await writeProjectFile(root, ".claude/skills/user-owned/SKILL.md", "# User Owned\n");
  const installed = await runInstall(root, { apply: true, personal: true, agent: "claude" });
  const parsed = JSON.parse(installed.stdout) as { plan: Array<{ path: string; changed: boolean; repairMode: string }> };
  const manifest = JSON.parse(await readFile(join(root, ".phasegate", "manifest.json"), "utf8")) as {
    entries: Array<{ path: string; mode: string }>;
  };
  return {
    exitCode: installed.exitCode,
    skillsPlan: parsed.plan.find((item) => item.path === ".claude/skills"),
    toolkitGuideContent: await readFile(join(root, ".claude/skills/phasegate-toolkit-guide/SKILL.md"), "utf8"),
    userOwnedContent: await readFile(join(root, ".claude/skills/user-owned/SKILL.md"), "utf8"),
    manifest,
  };
}

async function arrangePersonalCodexInstallWithExistingSkills() {
  const root = await createProjectRoot();
  await writeProjectFile(root, ".codex/skills/user-owned/SKILL.md", "# User Owned\n");
  const installed = await runInstall(root, { apply: true, personal: true, agent: "codex" });
  return {
    exitCode: installed.exitCode,
    toolkitGuideContent: await readFile(join(root, ".codex/skills/phasegate-toolkit-guide/SKILL.md"), "utf8"),
    userOwnedContent: await readFile(join(root, ".codex/skills/user-owned/SKILL.md"), "utf8"),
  };
}

async function arrangePersonalCodexInstallWithoutTeamAgents() {
  const root = await createProjectRoot();
  await writeProjectFile(root, "CLAUDE.md", "team-owned CLAUDE.md\n");
  await writeProjectFile(root, ".git/info/exclude", "# user local excludes\n");
  const installed = await runInstall(root, { apply: true, personal: true, agent: "codex" });
  const parsed = JSON.parse(installed.stdout) as {
    changed: Array<{ path: string }>;
  };
  return {
    installed,
    changedPaths: parsed.changed.map((item) => item.path),
    agentsContent: await readFile(join(root, "AGENTS.md"), "utf8"),
    excludeContent: await readFile(join(root, ".git/info/exclude"), "utf8"),
    manifestContent: await readFile(join(root, ".phasegate", "manifest.json"), "utf8"),
  };
}

async function arrangePersonalCodexInstallWithTeamAgents() {
  const root = await createProjectRoot();
  await writeProjectFile(root, "AGENTS.md", "team-owned AGENTS.md\n");
  const installed = await runInstall(root, { apply: true, personal: true, agent: "codex" });
  const parsed = JSON.parse(installed.stdout) as {
    plan: Array<{ path: string; changed: boolean; repairMode: string; summary: string }>;
    changed: Array<{ path: string }>;
  };
  return {
    installed,
    agentsPlan: parsed.plan.find((item) => item.path === "AGENTS.md"),
    changedPaths: parsed.changed.map((item) => item.path),
    agentsContent: await readFile(join(root, "AGENTS.md"), "utf8"),
    hasOverride: await fileExists(join(root, "AGENTS.override.md")),
  };
}

async function arrangeProjectInstallAndReadSkills(agent: "claude" | "codex" | "both", skillSet: "core" | "all" = "all") {
  const root = await createProjectRoot();
  const installed = await runInstall(root, { apply: true, agent, skillSet });
  const manifest = JSON.parse(await readFile(join(root, ".phasegate", "manifest.json"), "utf8")) as {
    entries: Array<{ path: string; hash: string; mode: string }>;
  };
  return {
    root,
    installed,
    manifest,
    hasToolkitGuide: await fileExists(join(root, "skills", "phasegate-toolkit-guide", "SKILL.md")),
    hasCoreSkill: await fileExists(join(root, "skills", "cascade-updater", "SKILL.md")),
    claudeLink: await fileExists(join(root, ".claude", "skills")) ? await readlink(join(root, ".claude", "skills")) : null,
    codexLink: await fileExists(join(root, ".codex", "skills")) ? await readlink(join(root, ".codex", "skills")) : null,
  };
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target("InstallHandler", () => {
  describe("structured merge", () => {
    it("既存 JSON hooks を保持して phasegate hooks と manifest を追加すること", async () => {
      // Act
      const actual = await arrangeJsonMergeAndInstall();

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.claude).toContain("custom stop");
      expect(actual.claude).toContain("npx phasegate hook stop");
      expect(actual.codex).toContain("custom");
      expect(actual.codex).toContain("npx phasegate hook pre-tool-use");
      expect(actual.config).toContain('"name": "phasegate-project"');
      expect(actual.manifest.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "phasegate.config.json", mode: "created" }),
          expect.objectContaining({ path: ".claude/settings.json", mode: "merged" }),
          expect.objectContaining({ path: "CLAUDE.md", mode: "created" }),
          expect.objectContaining({ path: ".codex/hooks.json", mode: "merged" }),
          expect.objectContaining({ path: "AGENTS.md", mode: "created" }),
          expect.objectContaining({ path: "package.json", mode: "created" }),
          expect.objectContaining({ path: ".github/workflows/phasegate-aidlc-gate.yml", mode: "created" }),
        ]),
      );
    });

    it("2回連続 apply しても target hash と manifest hash が変わらないこと", async () => {
      // Act
      const actual = await arrangeAndReadIdempotency();

      // Assert
      expect(actual.secondResult.exitCode).toBe(0);
      expect(actual.secondManifest).toBe(actual.firstManifest);
      expect(actual.secondPackage).toBe(actual.firstPackage);
      expect(actual.secondConfig).toBe(actual.firstConfig);
    });

    it("custom Husky script は force 無しで refuse し force で backup を取ること", async () => {
      // Act
      const actual = await arrangeCustomHuskyAndForce();

      // Assert
      expect(actual.refused.exitCode).toBe(1);
      expect(actual.forced.exitCode).toBe(0);
      expect(actual.forced.stdout).toContain(".phasegate/backups");
      expect(actual.content).toContain("echo custom");
      expect(actual.content).toContain("# === phasegate managed (BEGIN) ===");
    });

    it("既存 AGENTS.md の user content を保持して managed section を追加すること", async () => {
      // Act
      const actual = await arrangeExistingAgentsMdInstallAndRead();

      // Assert
      expect(actual).toContain("<!-- phasegate:managed-section:start -->");
      expect(actual).toContain("PhaseGate Managed Instructions");
      expect(actual).toContain("keep user text");
    });

    it("downstream install が package bin 経由の hook/workflow を配布すること", async () => {
      // Arrange
      const root = await createProjectRoot();

      // Act
      const actual = await installAndReadDownstreamTemplates(root);

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.preCommit).toContain('PHASEGATE_CMD="${PHASEGATE_CMD:-npx phasegate}"');
      expect(actual.preCommit).toContain("$PHASEGATE_CMD lint");
      expect(actual.preCommit).not.toContain("scripts/harness/main.ts");
      expect(actual.aidlcGate).toContain("if [ -f pnpm-lock.yaml ]; then");
      expect(actual.aidlcGate).toContain("RESULT=$(npx phasegate lint --json 2>&1)");
      expect(actual.aidlcGate).toContain("RESULT=$(npx phasegate phasegate:ci-check --json 2>&1)");
      expect(actual.aidlcGate).not.toContain("pnpm run harness");
    });

    it("personal Claude install は team-owned files を変更せず real runtime artifacts を自動初期化すること", async () => {
      // Arrange
      const root = await createProjectRoot();
      const before = await arrangeTeamOwnedFiles(root);

      // Act
      const actual = await runInstall(root, { apply: true, personal: true, agent: "claude" });
      const parsed = JSON.parse(actual.stdout) as {
        plan: Array<{ path: string }>;
        changed: Array<{ path: string }>;
      };

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(parsed.plan.map((item) => item.path)).not.toEqual(expect.arrayContaining([...TEAM_OWNED_FILES]));
      expect(parsed.changed.map((item) => item.path)).toEqual(
        expect.arrayContaining([
          ".phasegate-local/phasegate.config.json",
          ".claude/CLAUDE.md",
          ".claude/settings.json",
          ".claude/skills",
          ".git/hooks/pre-commit",
          ".git/hooks/commit-msg",
          ".phasegate-local/docs/folder_management_rules.md",
          ".phasegate-local/docs/principles/testing-rules.md",
          ".git/info/exclude",
        ]),
      );
      expect(await snapshotFiles(root, TEAM_OWNED_FILES)).toEqual(before);
      expect(await readFile(join(root, ".phasegate-local/phasegate.config.json"), "utf8")).toContain('"name": "personal-phasegate"');
      expect(await readFile(join(root, ".phasegate-local/phasegate.config.json"), "utf8")).toContain('"designDocs": ".phasegate-local/product/construction"');
      expect(await readFile(join(root, ".phasegate-local/phasegate.config.json"), "utf8")).toContain('"principlesDocs": ".phasegate-local/docs/principles"');
      expect(await readFile(join(root, ".phasegate-local/phasegate.config.json"), "utf8")).toContain('"folderRulesDoc": ".phasegate-local/docs/folder_management_rules.md"');
      expect(await readFile(join(root, ".claude/CLAUDE.md"), "utf8")).toContain("PhaseGate");
      expect(await readFile(join(root, ".claude/settings.json"), "utf8")).toContain("npx phasegate hook stop");
      expect(await readFile(join(root, ".claude/skills/.harness-version"), "utf8")).toContain('"version": "0.145.1"');
      expect(await readFile(join(root, ".git/hooks/pre-commit"), "utf8")).toContain("validate --layer L2");
      expect(await readFile(join(root, ".git/hooks/commit-msg"), "utf8")).toContain('commit-msg "$1"');
      expect(await readFile(join(root, ".phasegate-local/docs/folder_management_rules.md"), "utf8")).toContain("docs ディレクトリ管理ガイド");
      expect(await readFile(join(root, ".phasegate-local/docs/principles/testing-rules.md"), "utf8")).toContain("テスト");
      expect((await lstat(join(root, ".claude/settings.json"))).isSymbolicLink()).toBe(false);
      expect((await lstat(join(root, ".claude/skills"))).isDirectory()).toBe(true);
      expect((await lstat(join(root, ".claude/skills"))).isSymbolicLink()).toBe(false);
      expect(await readFile(join(root, ".git/info/exclude"), "utf8")).toContain("# phasegate personal install exclude (BEGIN)");
      expect(await readFile(join(root, ".phasegate", "manifest.json"), "utf8")).toContain(".phasegate-local/phasegate.config.json");

    });

    it("personal Codex install は project-local hooks と skills を real runtime artifacts として作成すること", async () => {
      // Arrange
      const root = await createProjectRoot();
      const before = await arrangeTeamOwnedFiles(root);

      // Act
      const actual = await runInstall(root, { apply: true, personal: true, agent: "codex" });
      const parsed = JSON.parse(actual.stdout) as {
        plan: Array<{ path: string }>;
        changed: Array<{ path: string }>;
      };

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(parsed.changed.map((item) => item.path)).not.toEqual(expect.arrayContaining([...TEAM_OWNED_FILES]));
      expect(parsed.changed.map((item) => item.path)).toEqual(
        expect.arrayContaining([
          ".phasegate-local/phasegate.config.json",
          ".codex/hooks.json",
          ".codex/skills",
          ".git/hooks/pre-commit",
          ".git/hooks/commit-msg",
          ".phasegate-local/docs/folder_management_rules.md",
          ".phasegate-local/docs/principles/testing-rules.md",
          ".git/info/exclude",
        ]),
      );
      expect(await snapshotFiles(root, TEAM_OWNED_FILES)).toEqual(before);
      expect(await readFile(join(root, ".codex/hooks.json"), "utf8")).toContain("npx phasegate hook stop");
      expect(await readFile(join(root, ".codex/skills/.harness-version"), "utf8")).toContain('"version": "0.145.1"');
      expect((await lstat(join(root, ".codex/hooks.json"))).isSymbolicLink()).toBe(false);
      expect((await lstat(join(root, ".codex/skills"))).isDirectory()).toBe(true);
      expect((await lstat(join(root, ".codex/skills"))).isSymbolicLink()).toBe(false);
    });

    it("personal Codex install は AGENTS.md が無い場合だけ runtime-visible local context を作成すること", async () => {
      // Act
      const actual = await arrangePersonalCodexInstallWithoutTeamAgents();

      // Assert
      expect(actual.installed.exitCode).toBe(0);
      expect(actual.changedPaths).toEqual(expect.arrayContaining(["AGENTS.md", ".codex/hooks.json", ".git/info/exclude"]));
      expect(actual.agentsContent).toContain("PhaseGate");
      expect(actual.excludeContent).toContain("AGENTS.md");
      expect(actual.manifestContent).toContain('"path": "AGENTS.md"');
    });

    it("personal Codex install は既存 team AGENTS.md を上書きせず manual readiness として残すこと", async () => {
      // Act
      const actual = await arrangePersonalCodexInstallWithTeamAgents();

      // Assert
      expect(actual.installed.exitCode).toBe(0);
      expect(actual.agentsPlan).toMatchObject({ changed: false, repairMode: "manual" });
      expect(actual.changedPaths).not.toContain("AGENTS.md");
      expect(actual.agentsContent).toBe("team-owned AGENTS.md\n");
      expect(actual.hasOverride).toBe(false);
    });

    it("personal Claude doctor は team/project targets を scoped out すること", async () => {
      // Arrange
      // Act
      const actual = await arrangePersonalClaudeDoctorResult();

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.payload.scope.installationMode).toBe("personal");
      expect(actual.payload.findings).toEqual([]);
      expect(actual.payload.scopedOutFindings.map((item) => item.checkId)).toEqual(
        expect.arrayContaining(["package-json-devdep-missing", "husky-pre-commit-missing", "codex-hook-missing"]),
      );
    });

    it("personal Claude install は既存 .claude/settings.json を上書きしないこと", async () => {
      // Arrange
      // Act
      const actual = await arrangePersonalInstallWithExistingClaudeSettings();

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.settingsPlan).toMatchObject({ changed: false, repairMode: "manual" });
      expect(actual.settingsContent).toBe("{\"custom\": true}\n");
    });

    it("personal Codex install は既存 .codex/hooks.json を上書きしないこと", async () => {
      // Arrange
      // Act
      const actual = await arrangePersonalInstallWithExistingCodexHooks();

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.hooksPlan).toMatchObject({ changed: false, repairMode: "manual" });
      expect(actual.hooksContent).toBe("{\"custom\": true}\n");
    });

    it("personal Claude install は既存 skills directory に bundled skills を追加して user-owned skill を保持すること", async () => {
      // Arrange

      // Act
      const actual = await arrangePersonalClaudeInstallWithExistingSkills();

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.skillsPlan).toMatchObject({ changed: true, repairMode: "mechanical" });
      expect(actual.toolkitGuideContent).toContain("phasegate-toolkit-guide");
      expect(actual.userOwnedContent).toBe("# User Owned\n");
      expect(actual.manifest.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ".claude/skills/.harness-version", mode: "created" }),
        expect.objectContaining({ path: ".claude/skills/phasegate-toolkit-guide", mode: "created" }),
      ]));
      expect(actual.manifest.entries.find((entry) => entry.path === ".claude/skills")).toStrictEqual(undefined);
    });

    it("personal Codex install は既存 skills directory に bundled skills を追加して user-owned skill を保持すること", async () => {
      // Arrange

      // Act
      const actual = await arrangePersonalCodexInstallWithExistingSkills();

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.toolkitGuideContent).toContain("phasegate-toolkit-guide");
      expect(actual.userOwnedContent).toBe("# User Owned\n");
    });

    it("project Claude install は root shared skills を配布して Claude link から参照できること", async () => {
      // Act
      const actual = await arrangeProjectInstallAndReadSkills("claude");

      // Assert
      expect(actual.installed.exitCode).toBe(0);
      expect(await readFile(join(actual.root, "skills", "phasegate-toolkit-guide", "SKILL.md"), "utf8")).toContain("phasegate-toolkit-guide");
      expect(await readFile(join(actual.root, ".claude", "skills", "phasegate-toolkit-guide", "SKILL.md"), "utf8")).toContain("phasegate-toolkit-guide");
      expect(actual.claudeLink).toBe("../skills");
      expect(actual.codexLink).toStrictEqual(null);
      expect(actual.manifest.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "skills/.harness-version", mode: "created" }),
        expect.objectContaining({ path: "skills/phasegate-toolkit-guide", mode: "created" }),
        expect.objectContaining({ path: ".claude/skills", mode: "symlink" }),
      ]));
    });

    it("project Codex install は root shared skills を配布して Codex link から参照できること", async () => {
      // Act
      const actual = await arrangeProjectInstallAndReadSkills("codex");

      // Assert
      expect(actual.installed.exitCode).toBe(0);
      expect(await readFile(join(actual.root, "skills", "phasegate-toolkit-guide", "SKILL.md"), "utf8")).toContain("phasegate-toolkit-guide");
      expect(await readFile(join(actual.root, ".codex", "skills", "phasegate-toolkit-guide", "SKILL.md"), "utf8")).toContain("phasegate-toolkit-guide");
      expect(actual.claudeLink).toStrictEqual(null);
      expect(actual.codexLink).toBe("../skills");
    });

    it("project both install の --skills core は core だけを配布し manifest hash に selection を反映すること", async () => {
      // Act
      const actual = await arrangeProjectInstallAndReadSkills("both", "core");

      // Assert
      expect(actual.installed.exitCode).toBe(0);
      expect(await readFile(join(actual.root, "skills", "cascade-updater", "SKILL.md"), "utf8")).toContain("cascade-updater");
      await expect(readFile(join(actual.root, "skills", "phasegate-toolkit-guide", "SKILL.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      expect(actual.claudeLink).toBe("../skills");
      expect(actual.codexLink).toBe("../skills");
      expect(actual.manifest.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "skills/cascade-updater", mode: "created" }),
      ]));
      expect(actual.manifest.entries.find((entry) => entry.path === "skills/phasegate-toolkit-guide")).toStrictEqual(undefined);
    });
  });
});
