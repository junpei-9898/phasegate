// @unit harness-api
// @layer integration
// @story H13-04
// @work-item-id WI-385

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { context, target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");
const TSX_IMPORT = createRequire(import.meta.url).resolve("tsx");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 20_000,
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", TSX_IMPORT, MAIN_TS, ...args], { cwd, env });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(
        new Error(`CLI timed out after ${timeoutMs}ms: ${args.join(" ")}\nstdout:\n${stdout}\nstderr:\n${stderr}`),
      );
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.end();
  });
}

target("phasegate subcommand --help (WI-091 finding #3)", () => {
  context("副作用ありコマンドの --help は usage を出して run しないこと", () => {
    it("update-skills --help は exit 0 で usage を表示し skill redeploy が走らないこと", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-update-skills-"));

      // Act
      const actual = await runCli(["update-skills", "--help"], workDir);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Usage: phasegate update-skills");
      expect(actual.stdout).toContain("WARNING");
      expect(actual.stdout).not.toContain("Skills updated");
      expect(existsSync(path.join(workDir, ".claude", "skills"))).toBe(false);
      void rm(workDir, { recursive: true, force: true });
    }, 60000);

    it("phasegate:detect-drift --help は exit 0 で usage を表示し drift 実 run が走らないこと", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-detect-drift-"));

      // Act
      const actual = await runCli(["phasegate:detect-drift", "--help"], workDir);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Usage: phasegate phasegate:detect-drift");
      expect(actual.stdout).not.toContain('"drifts"');
      void rm(workDir, { recursive: true, force: true });
    }, 60000);

    it("validate --help は exit 0 で usage を表示し phase gate 実走しないこと", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-validate-"));

      // Act
      const actual = await runCli(["validate", "--help"], workDir);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Usage: phasegate validate");
      expect(actual.stdout).not.toContain("総合判定");
      void rm(workDir, { recursive: true, force: true });
    }, 60000);
  });

  context("table 未登録の subcommand には generic fallback usage を出すこと", () => {
    it("未登録 subcommand --help は generic fallback で exit 0 になること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-fallback-"));

      // Act
      const actual = await runCli(["skill:execute-tdd-cycle", "--help"], workDir);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Usage: phasegate skill:execute-tdd-cycle");
      expect(actual.stdout).toContain("'phasegate --help'");
      void rm(workDir, { recursive: true, force: true });
    }, 60000);
  });

  context("-h short flag も同様に解釈されること", () => {
    it("phasegate:status -h は exit 0 で usage を表示すること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-short-"));

      // Act
      const actual = await runCli(["phasegate:status", "-h"], workDir);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Usage: phasegate phasegate:status");
      void rm(workDir, { recursive: true, force: true });
    }, 60000);
  });
});
