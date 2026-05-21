// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-146
// @work-item-id WI-174
// @work-item-id WI-182
// @work-item-id WI-183
// @work-item-id WI-207
// @work-item-id WI-208

import { lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
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

async function runInstall(root: string, options: { apply?: boolean; force?: boolean; personal?: boolean; agent?: "claude" | "codex" | "both" } = {}) {
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
  const secondResult = await runInstall(root, { apply: true });
  return {
    secondResult,
    firstManifest,
    secondManifest: await readFile(join(root, ".phasegate", "manifest.json"), "utf8"),
    firstPackage,
    secondPackage: await readFile(join(root, "package.json"), "utf8"),
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
      expect(actual.manifest.entries).toEqual(
        expect.arrayContaining([
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

    it("personal Claude install は team-owned files を変更せず sandbox と root shim を自動初期化すること", async () => {
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
          ".phasegate-local/claude/settings.json",
          ".phasegate-local/skills",
          ".claude/settings.json",
          ".claude/skills",
          ".git/info/exclude",
        ]),
      );
      expect(await snapshotFiles(root, TEAM_OWNED_FILES)).toEqual(before);
      expect(await readFile(join(root, ".phasegate-local/phasegate.config.json"), "utf8")).toContain('"name": "personal-phasegate"');
      expect(await readFile(join(root, ".phasegate-local/claude/settings.json"), "utf8")).toContain("npx phasegate hook stop");
      expect(await readFile(join(root, ".phasegate-local/skills/.harness-version"), "utf8")).toContain('"version": "0.145.1"');
      expect((await lstat(join(root, ".claude/settings.json"))).isSymbolicLink()).toBe(true);
      expect(await readlink(join(root, ".claude/settings.json"))).toBe("../.phasegate-local/claude/settings.json");
      expect(await readlink(join(root, ".claude/skills"))).toBe("../.phasegate-local/skills");
      expect(await readFile(join(root, ".git/info/exclude"), "utf8")).toContain("# phasegate personal install exclude (BEGIN)");
      expect(await readFile(join(root, ".phasegate", "manifest.json"), "utf8")).toContain(".phasegate-local/phasegate.config.json");

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
  });
});
