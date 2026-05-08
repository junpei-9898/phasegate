// @unit harness-api
// @layer integration
// @story H13-04

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
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

target("phasegate init flag validation (WI-090)", () => {
  context("typo を検出して suggestion を返す", () => {
    it("typo フラグ --skill-set core は exit 2 で Did you mean --skills を出すこと", async () => {
      const actual = await runCli(["init", "--skill-set", "core"], HARNESS_ROOT);
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("unknown flag '--skill-set'");
      expect(actual.stderr).toContain("Did you mean '--skills'?");
    }, 60000);

    it("equals 形式の typo --skill-set=core も exit 2 で suggestion を出すこと", async () => {
      const actual = await runCli(["init", "--skill-set=core"], HARNESS_ROOT);
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("unknown flag '--skill-set'");
      expect(actual.stderr).toContain("Did you mean '--skills'?");
    }, 60000);
  });

  context("近い known flag が無い完全に未知のフラグを扱う", () => {
    it("完全に未知のフラグ --xyz-totally-unknown は exit 2 で known flags の列挙を出すこと", async () => {
      const actual = await runCli(["init", "--xyz-totally-unknown"], HARNESS_ROOT);
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("unknown flag '--xyz-totally-unknown'");
      expect(actual.stderr).toContain("Known flags:");
      expect(actual.stderr).toContain("--skills");
      expect(actual.stderr).toContain("--agent");
    }, 60000);
  });

  context("known flag のみの場合は flag validation で error にしない", () => {
    it("正しい組み合わせ --name foo --skills all --agent claude --yes は flag validation で reject されないこと", async () => {
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-init-flagcheck-"));
      try {
        const actual = await runCli(
          ["init", "--name", "foo", "--skills", "all", "--agent", "claude", "--yes"],
          workDir,
        );
        expect(actual.stderr).not.toContain("unknown flag");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 120000);
  });
});
