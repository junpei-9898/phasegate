// @unit agent-integration
// @layer integration
// @story H11-02
// @work-item-id WI-384

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(currentDirectory, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");
const TSX_IMPORT = createRequire(import.meta.url).resolve("tsx");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function createProjectRoot(): string {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi384-native-"));
  writeFileSync(
    path.join(projectRoot, "phasegate.config.json"),
    `${JSON.stringify({
      project: { name: "wi384-native", preset: "standard" },
      architecture: { preset: "clean" },
      layers: {},
      quickMode: {
        allowedCategories: ["bugfix", "docs", "test", "config"],
        relaxedGates: ["phase-gate", "2-phase-execution"],
      },
      phaseDependencies: { preset: "default", override: false, customRules: [] },
      planningMode: { default: "interactive", perPhase: {} },
      harnesses: {},
      paths: { designDocs: "docs/product/construction", inceptionDocs: "docs/inception" },
      reporting: { format: "json", outputDir: "reports" },
    }, null, 2)}\n`,
    "utf8",
  );
  return projectRoot;
}

function runPreToolUse(stdin: string, cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, ["--import", TSX_IMPORT, MAIN_TS, "hook", "pre-tool-use"], {
      cwd,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ exitCode: code ?? -1, stdout, stderr }));
    child.stdin.end(stdin);
  });
}

function buildNativePayload(projectRoot: string, command?: string, extras: Record<string, unknown> = {}): string {
  return JSON.stringify({
    cwd: projectRoot,
    hook_event_name: "PreToolUse",
    model: "gpt-5-codex",
    permission_mode: "default",
    session_id: "session-wi384",
    tool_input: command === undefined ? {} : { command },
    tool_name: "apply_patch",
    tool_use_id: "tool-wi384",
    transcript_path: path.join(projectRoot, "transcript.jsonl"),
    turn_id: "turn-wi384",
    ...extras,
  });
}

target("Codex native apply_patch payload compatibility", () => {
  describe("raw patch を編集前 gate へ合流させる", () => {
    it("許可済み docs の Update patch は空 stdout の exit 0 で継続すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const stdin = buildNativePayload(
        projectRoot,
        "*** Begin Patch\n*** Update File: docs/guide/allowed.md\n@@\n-old\n+new\n*** End Patch",
      );

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toBe("");
      expect(actual.stdout).not.toContain("permissionDecision");
      expect(actual.stdout).not.toContain("updatedInput");
    }, 60000);

    it("protected file の Update patch は非空 stderr の exit 2 で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const stdin = buildNativePayload(
        projectRoot,
        "*** Begin Patch\n*** Update File: biome.json\n@@\n-old\n+new\n*** End Patch",
      );

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("biome.json");
      expect(actual.stderr.length).toBeGreaterThan(0);
    }, 60000);

    it("未反映 Unit の Add patch は CREATE の書き込みとして exit 2 で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const targetPath = "scripts/harness/unreflected-unit/application/new-service.ts";
      const stdin = buildNativePayload(
        projectRoot,
        `*** Begin Patch\n*** Add File: ${targetPath}\n+export const value = 1;\n*** End Patch`,
      );

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain(targetPath);
      expect(actual.stderr.length).toBeGreaterThan(0);
    }, 60000);

    it("Full Mode 必須 path の Delete patch は session が無ければ exit 2 で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const targetPath = "src/domain/obsolete.ts";
      const stdin = buildNativePayload(
        projectRoot,
        `*** Begin Patch\n*** Delete File: ${targetPath}\n*** End Patch`,
      );

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("Full mode 必須変更が検出されました");
      expect(actual.stderr).toContain(targetPath);
    }, 60000);

    it("複数種別が混在して一件でも違反する patch は全体を exit 2 で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const stdin = buildNativePayload(projectRoot, [
        "*** Begin Patch",
        "*** Update File: docs/guide/allowed.md",
        "@@",
        "-old",
        "+new",
        "*** Add File: biome.json",
        "+{}",
        "*** Delete File: docs/guide/obsolete.md",
        "*** End Patch",
      ].join("\n"));

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("biome.json");
      expect(actual.stdout).toBe("");
    }, 60000);

    it("docs から保護対象への Move to patch は移動先の CREATE 検査で exit 2 になること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const stdin = JSON.stringify({
        session_id: "t",
        cwd: projectRoot,
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_input: {
          command: "*** Begin Patch\n*** Update File: docs/x.md\n*** Move to: .husky/post-checkout\n*** End Patch",
        },
      });

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain(".husky/post-checkout");
      expect(actual.stdout).toBe("");
    }, 60000);

    it("command が欠けた native payload は silent allow せず exit 2 で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const stdin = buildNativePayload(projectRoot);

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr.length).toBeGreaterThan(0);
    }, 60000);

    it("Begin marker のない native command は target 不明として exit 2 で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const stdin = buildNativePayload(projectRoot, "*** Update File: docs/guide/unknown.md");

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr.length).toBeGreaterThan(0);
    }, 60000);

    it("optional agent fields を含む native payload も同じ allow 契約で受理すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const stdin = buildNativePayload(
        projectRoot,
        "*** Begin Patch\n*** Update File: docs/guide/agent.md\n@@\n-old\n+new\n*** End Patch",
        { agent_id: "agent-001", agent_type: "subagent" },
      );

      // Act
      const actual = await runPreToolUse(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toBe("");
    }, 60000);
  });
});
