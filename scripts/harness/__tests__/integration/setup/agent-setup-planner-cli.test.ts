// @unit harness-api
// @layer integration
// @work-item-id WI-171
// @work-item-id WI-172
// @work-item-id WI-173
// @story H11-06

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

const HARNESS_ROOT = resolve(process.cwd());
const MAIN_TS = join(HARNESS_ROOT, "scripts/harness/main.ts");

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runCli(args: readonly string[], cwd: string): Promise<CliResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn("npx", ["tsx", MAIN_TS, ...args], { cwd });
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
      resolveResult({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.end();
  });
}

async function withTempProject<T>(testFn: (projectRoot: string) => Promise<T>): Promise<T> {
  const projectRoot = await mkdtemp(join(tmpdir(), "phasegate-setup-planner-"));
  try {
    return await testFn(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

target("agent setup planner CLI", () => {
  describe("setup and config planning commands", () => {
    it("setup:agent dry-run が検出結果と検証手順を返すこと", async () => {
      // Act
      const actual = await withTempProject(async (projectRoot) => {
        return await runCli(["setup:agent", "--intent", "strict", "--with-ci", "--with-husky", "--dry-run", "--json"], projectRoot);
      });

      // Assert
      const parsed = JSON.parse(actual.stdout) as { plan: { intent: string; changes: string[]; validation: string[] }; applied: boolean };
      expect(actual.exitCode).toBe(0);
      expect(parsed.applied).toBe(false);
      expect(parsed.plan.intent).toBe("strict");
      expect(parsed.plan.changes.join("\n")).toContain("GitHub Actions");
      expect(parsed.plan.validation).toContain("phasegate doctor");
    }, 120000);

    it("config:plan が Codex hook 変更対象と user-level 手順を分けて返すこと", async () => {
      // Act
      const actual = await withTempProject(async (projectRoot) => {
        return await runCli(["config:plan", "--intent", "codex-hooks", "--json"], projectRoot);
      });

      // Assert
      const parsed = JSON.parse(actual.stdout) as { targets: string[]; commands: string[]; validations: string[] };
      expect(actual.exitCode).toBe(0);
      expect(parsed.targets).toContain(".codex/hooks.json");
      expect(parsed.targets).toContain("AGENTS.md");
      expect(parsed.commands).toContain("codex features enable codex_hooks");
      expect(parsed.validations).toContain("phasegate doctor --json");
    }, 120000);
  });
});
