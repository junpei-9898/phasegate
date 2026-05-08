// @unit harness-api
// @layer integration
// @story H13-04

import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { context, target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", MAIN_TS, ...args], { cwd, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.end();
  });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

target("phasegate subcommand --help (WI-091 finding #3)", () => {
  context("副作用ありコマンドの --help は usage を出して run しないこと", () => {
    it("update-skills --help は exit 0 で usage を表示し skill redeploy が走らないこと", async () => {
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-update-skills-"));
      try {
        const actual = await runCli(["update-skills", "--help"], workDir);
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("Usage: phasegate update-skills");
        expect(actual.stdout).toContain("WARNING");
        expect(actual.stdout).not.toContain("Skills updated");
        const skillsDeployed = await pathExists(path.join(workDir, ".claude", "skills"));
        expect(skillsDeployed).toBe(false);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    it("phasegate:detect-drift --help は exit 0 で usage を表示し drift 実 run が走らないこと", async () => {
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-detect-drift-"));
      try {
        const actual = await runCli(["phasegate:detect-drift", "--help"], workDir);
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("Usage: phasegate phasegate:detect-drift");
        expect(actual.stdout).not.toContain('"drifts"');
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    it("validate --help は exit 0 で usage を表示し phase gate 実走しないこと", async () => {
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-validate-"));
      try {
        const actual = await runCli(["validate", "--help"], workDir);
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("Usage: phasegate validate");
        expect(actual.stdout).not.toContain("総合判定");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("table 未登録の subcommand には generic fallback usage を出すこと", () => {
    it("未登録 subcommand --help は generic fallback で exit 0 になること", async () => {
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-fallback-"));
      try {
        const actual = await runCli(["skill:execute-tdd-cycle", "--help"], workDir);
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("Usage: phasegate skill:execute-tdd-cycle");
        expect(actual.stdout).toContain("'phasegate --help'");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("-h short flag も同様に解釈されること", () => {
    it("phasegate:status -h は exit 0 で usage を表示すること", async () => {
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-help-short-"));
      try {
        const actual = await runCli(["phasegate:status", "-h"], workDir);
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("Usage: phasegate phasegate:status");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });
});
