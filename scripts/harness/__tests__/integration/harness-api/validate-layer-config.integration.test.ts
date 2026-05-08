// @unit harness-api
// @layer integration
// @story H13-04

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

async function writeConfig(workDir: string, config: object): Promise<void> {
  await writeFile(path.join(workDir, "phasegate.config.json"), JSON.stringify(config, null, 2), "utf-8");
}

const BASE_CONFIG = {
  project: { name: "test", preset: "standard" },
  architecture: { preset: "clean" },
  quickMode: {},
  phaseDependencies: { preset: "standard", override: false, customRules: [] },
  planningMode: { default: "interactive", perPhase: {} },
  harnesses: {},
  paths: { designDocs: "docs/product/construction", inceptionDocs: "docs/inception" },
  reporting: { format: "json", outputDir: "reports" },
};

target("phasegate validate --layer config threading (WI-091 finding #1 follow-up)", () => {
  context("layers.L4.enabled: false が設定されている場合", () => {
    it("validate --layer L4 は L4 全 validator を SKIP として扱い 総合判定 PASS で exit 0 になること", async () => {
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-l4disabled-"));
      try {
        await writeConfig(workDir, { ...BASE_CONFIG, layers: { L4: { enabled: false } } });

        const actual = await runCli(["validate", "--layer", "L4"], workDir);

        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("総合判定: PASS");
        expect(actual.stdout).not.toContain("[FAIL] L4-001");
        expect(actual.stdout).not.toContain("[PASS] L4-001");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("layers.L4.enabled: true が explicit に設定されている場合 (回帰防止)", () => {
    it("validate --layer L4 は L4 validator が実行され SKIP 扱いにならないこと", async () => {
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-l4explicit-"));
      try {
        await writeConfig(workDir, { ...BASE_CONFIG, layers: { L4: { enabled: true } } });

        const actual = await runCli(["validate", "--layer", "L4"], workDir);

        // L4 validator が実行されることを stdout で確認 (PASS or FAIL いずれでもよい)
        expect(actual.stdout).toContain("バリデータ:");
        const hasL4Active = /\[(PASS|FAIL)\] L4-001/.test(actual.stdout);
        expect(hasL4Active).toBe(true);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });
});
