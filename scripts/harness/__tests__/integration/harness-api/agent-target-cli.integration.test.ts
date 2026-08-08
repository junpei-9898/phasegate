// @unit harness-api
// @layer integration
// @story H13-04
// @work-item-id WI-385

import { spawn } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(currentDirectory, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");
const TSX_IMPORT = createRequire(import.meta.url).resolve("tsx");
const AGENT_ENUM = "claude|codex|both|grok|antigravity|all";
let projectRoots: string[] = [];

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runCli(args: readonly string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", TSX_IMPORT, MAIN_TS, ...args], { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ exitCode: code ?? -1, stdout, stderr }));
    child.stdin.end();
  });
}

async function createProject(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  projectRoots.push(root);
  await writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "fixture", version: "0.0.0" })}\n`,
    "utf8",
  );
  return root;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await Promise.all(projectRoots.map((root) => rm(root, { recursive: true, force: true })));
  projectRoots = [];
});

target("AgentTarget CLI contract", () => {
  describe("help と parser で同じ公開 enum を扱う", () => {
    it("ルートhelpは六種類のagent targetを全コマンドへ表示すること", async () => {
      // Arrange
      const root = await createProject("phasegate-agent-help-root-");

      // Act
      const actual = await runCli(["--help"], root);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout.split(AGENT_ENUM).length - 1).toBeGreaterThanOrEqual(4);
    });

    it("個別helpはinit・install・setup・doctorで六種類を一致表示すること", async () => {
      // Arrange
      const root = await createProject("phasegate-agent-help-sub-");

      // Act
      const actual = await Promise.all([
        runCli(["init", "--help"], root),
        runCli(["install", "--help"], root),
        runCli(["setup:agent", "--help"], root),
        runCli(["doctor", "--help"], root),
      ]);

      // Assert
      expect(actual.every((result) => result.exitCode === 0)).toBe(true);
      expect(actual.every((result) => result.stdout.includes(AGENT_ENUM))).toBe(true);
    }, 60000);

    it("導入parserはGrok・反重力・allをfallbackせず受理すること", async () => {
      // Arrange
      const roots = await Promise.all([
        createProject("phasegate-agent-install-grok-"),
        createProject("phasegate-agent-install-agy-"),
        createProject("phasegate-agent-install-all-"),
      ]);

      // Act
      const actual = await Promise.all([
        runCli(["install", "--dry-run", "--agent", "grok", "--json"], roots[0]),
        runCli(["install", "--dry-run", "--agent", "antigravity", "--json"], roots[1]),
        runCli(["install", "--dry-run", "--agent", "all", "--json"], roots[2]),
      ]);

      // Assert
      expect(actual.every((result) => result.exitCode === 0)).toBe(true);
      expect(actual[0].stdout).toContain(".claude/settings.json");
      expect(actual[0].stdout).not.toContain(".codex/hooks.json");
      expect(actual[1].stdout).toContain(".agents/hooks.json");
      expect(actual[2].stdout).toContain(".codex/hooks.json");
    }, 60000);

    it("設定支援parserは新三targetをplanのagent値へ保持すること", async () => {
      // Arrange
      const root = await createProject("phasegate-agent-setup-");

      // Act
      const actual = await Promise.all([
        runCli(["setup:agent", "--dry-run", "--agent", "grok", "--json"], root),
        runCli(["setup:agent", "--dry-run", "--agent", "antigravity", "--json"], root),
        runCli(["setup:agent", "--dry-run", "--agent", "all", "--json"], root),
      ]);

      // Assert
      expect(actual.map((result) => JSON.parse(result.stdout).plan.agent)).toEqual(["grok", "antigravity", "all"]);
    }, 60000);

    it("診断parserは新三scopeをinvalid扱いせず構造化出力へ保持すること", async () => {
      // Arrange
      const root = await createProject("phasegate-agent-doctor-");

      // Act
      const actual = await Promise.all([
        runCli(["doctor", "--agent", "grok", "--json"], root),
        runCli(["doctor", "--agent", "antigravity", "--json"], root),
        runCli(["doctor", "--agent", "all", "--json"], root),
      ]);

      // Assert
      expect(actual.map((result) => JSON.parse(result.stdout).scope.agent)).toEqual(["grok", "antigravity", "all"]);
      expect(actual.every((result) => result.exitCode === 1)).toBe(true);
    }, 60000);

    it("未知agent値は導入・設定支援・診断の全てでexit2になること", async () => {
      // Arrange
      const root = await createProject("phasegate-agent-invalid-");

      // Act
      const actual = await Promise.all([
        runCli(["install", "--agent", "future"], root),
        runCli(["setup:agent", "--agent", "future"], root),
        runCli(["doctor", "--agent", "future"], root),
      ]);

      // Assert
      expect(actual.every((result) => result.exitCode === 2)).toBe(true);
      expect(actual.every((result) => result.stderr.includes(AGENT_ENUM))).toBe(true);
    }, 60000);
  });

  describe("deprecated init も新 target mappingへ委譲する", () => {
    it("初期化でGrokを選ぶと互換settingsとAGENTSを作りgrok専用dirを作らないこと", async () => {
      // Arrange
      const root = await createProject("phasegate-agent-init-grok-");

      // Act
      const actual = await runCli(["init", "--agent", "grok", "--skills", "core", "--yes"], root);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(await exists(path.join(root, ".claude/settings.json"))).toBe(true);
      expect(await exists(path.join(root, "AGENTS.md"))).toBe(true);
      expect(await exists(path.join(root, ".grok"))).toBe(false);
    }, 60000);

    it("初期化で反重力を選ぶとnamed hooksを作成すること", async () => {
      // Arrange
      const root = await createProject("phasegate-agent-init-agy-");

      // Act
      const actual = await runCli(["init", "--agent", "antigravity", "--skills", "core", "--yes"], root);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(await exists(path.join(root, ".agents/hooks.json"))).toBe(true);
      expect(await exists(path.join(root, "AGENTS.md"))).toBe(true);
    }, 60000);

    it("初期化でallを選ぶと三hook surfaceを作成すること", async () => {
      // Arrange
      const root = await createProject("phasegate-agent-init-all-");

      // Act
      const actual = await runCli(["init", "--agent", "all", "--skills", "core", "--yes"], root);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(await exists(path.join(root, ".claude/settings.json"))).toBe(true);
      expect(await exists(path.join(root, ".codex/hooks.json"))).toBe(true);
      expect(await exists(path.join(root, ".agents/hooks.json"))).toBe(true);
    }, 60000);
  });
});
