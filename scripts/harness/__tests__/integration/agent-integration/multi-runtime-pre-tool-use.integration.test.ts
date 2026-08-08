// @unit agent-integration
// @layer integration
// @story H11-02
// @work-item-id WI-385

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
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function createProjectRoot(): string {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi385-runtime-"));
  writeFileSync(
    path.join(projectRoot, "phasegate.config.json"),
    `${JSON.stringify(
      {
        project: { name: "wi385-runtime", preset: "standard" },
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
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return projectRoot;
}

function runPreToolUse(payload: unknown, cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, ["--import", TSX_IMPORT, MAIN_TS, "hook", "pre-tool-use"], {
      cwd,
      env: process.env,
    });
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
    child.stdin.end(JSON.stringify(payload));
  });
}

function grokPayload(projectRoot: string, toolName: string, toolInput: Record<string, unknown>, extras = {}): unknown {
  return {
    hookEventName: "PreToolUse",
    sessionId: "grok-session",
    cwd: projectRoot,
    workspaceRoot: projectRoot,
    permissionMode: "default",
    toolName,
    toolInput,
    toolUseId: "grok-tool-use",
    unknownFutureField: true,
    ...extras,
  };
}

function antigravityPayload(projectRoot: string, name: string, args: Record<string, unknown>, extras = {}): unknown {
  return {
    toolCall: { name, args },
    conversationId: "agy-conversation",
    workspacePaths: [projectRoot],
    transcriptPath: path.join(projectRoot, "transcript.jsonl"),
    modelName: "unknown-antigravity-model",
    stepIdx: 1,
    unknownFutureField: true,
    ...extras,
  };
}

target("multi-runtime PreToolUse payload compatibility", () => {
  describe("Grok camelCase payload を編集前 gate へ接続する", () => {
    it("検索置換で保護設定を狙うと互換deny JSONとexit2を返すこと", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = grokPayload(projectRoot, "search_replace", {
        file_path: "biome.json",
        old_string: "{}",
        new_string: '{"x":true}',
      });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout)).toMatchObject({
        decision: "deny",
        reason: expect.stringContaining("biome.json"),
        hookSpecificOutput: { permissionDecision: "deny" },
      });
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("端末redirectで保護設定を狙うとBash抽出後に拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = grokPayload(projectRoot, "run_terminal_command", { command: "echo x > biome.json" });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout).decision).toBe("deny");
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("生patchで保護設定を更新するとpatch抽出後に拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const patch = '*** Begin Patch\n*** Update File: biome.json\n@@\n-{}\n+{"x":true}\n*** End Patch';
      const payload = grokPayload(projectRoot, "apply_patch", { patch });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout).decision).toBe("deny");
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("切詰めpatchはgate呼出前に具体理由で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = grokPayload(
        projectRoot,
        "apply_patch",
        { patch: "*** Begin Patch\n*** Update File: docs/a.md" },
        { toolInputTruncated: true },
      );

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout).reason).toContain("切り詰め");
      expect(actual.stderr).toContain("切り詰め");
    }, 60000);

    it("許可範囲への直接writeはpermission上書きなしで空stdoutを返すこと", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = grokPayload(projectRoot, "write", { file_path: "docs/guide/allowed.md", content: "ok" });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toBe("");
    }, 60000);
  });

  describe("Antigravity nested payload を編集前 gate へ接続する", () => {
    it("対象file候補で保護設定を書くとtopLevel二fieldで拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = antigravityPayload(projectRoot, "write_to_file", {
        TargetFile: "biome.json",
        CodeContent: "{}",
      });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout)).toEqual({
        decision: "deny",
        reason: expect.stringContaining("biome.json"),
      });
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("内容置換で保護設定を狙うとnested契約のdenyを返すこと", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = antigravityPayload(projectRoot, "replace_file_content", {
        targetFile: "biome.json",
        oldContent: "{}",
        newContent: '{"x":true}',
      });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout).decision).toBe("deny");
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("複数置換で保護設定を狙うと単一path検査で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = antigravityPayload(projectRoot, "multi_replace_file_content", {
        file_path: "biome.json",
        replacements: [{ old: "{}", new: '{"x":true}' }],
      });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout).decision).toBe("deny");
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("shell命令で保護設定へredirectすると抽出後に拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = antigravityPayload(projectRoot, "run_command", { CommandLine: "echo x > biome.json" });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout).decision).toBe("deny");
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("不明argsだけの対応writeはsilent allowせず候補案内で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = antigravityPayload(projectRoot, "write_to_file", { destination: "biome.json" });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout).reason).toContain("TargetFile");
      expect(actual.stderr).toContain("write_to_file");
    }, 60000);

    it("安全docsへの入れ子writeは空stdoutのexit0で継続すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = antigravityPayload(projectRoot, "write_to_file", {
        filePath: "docs/guide/allowed.md",
        codeContent: "ok",
      });

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toBe("");
    }, 60000);
  });

  describe("既存 snake_case payload 契約を維持する", () => {
    it("Claude形式の保護writeは従来どおり空stdoutと非空stderrで拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = {
        cwd: projectRoot,
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: { file_path: "biome.json", content: "{}" },
      };

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stdout).toBe("");
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("Codex形式のnative patchも従来どおり余計なstdoutなしで拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = {
        cwd: projectRoot,
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_input: { command: "*** Begin Patch\n*** Update File: biome.json\n*** End Patch" },
      };

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stdout).toBe("");
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("Writeのpaths配列に保護対象が含まれれば従来契約で拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = {
        cwd: projectRoot,
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: { paths: ["docs/guide/allowed.md", "biome.json"] },
      };

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stdout).toBe("");
      expect(actual.stderr).toContain("biome.json");
    }, 60000);

    it("toolCall近傍形状の未知args keyはtopLevel deny JSONで拒否すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const payload = {
        toolCall: { tool_name: "write_to_file", arguments: { TargetFile: "biome.json" } },
        workspacePaths: [projectRoot],
      };

      // Act
      const actual = await runPreToolUse(payload, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.stdout)).toEqual({
        decision: "deny",
        reason: expect.stringContaining("toolCall"),
      });
      expect(actual.stderr).toContain("toolCall");
    }, 60000);
  });
});
