// @unit agent-integration
// @layer integration-test
// @work-item-id WI-304
// @story H17-16
// @ac H17-16-1
// @ac H17-16-2
// @ac H17-16-3
// @ac H17-16-4
// @ac H17-16-5
// @ac H17-16-6

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(here, "../../../../..");
const mainPath = path.join(harnessRoot, "scripts/harness/main.ts");
const tsxLoader = path.join(harnessRoot, "node_modules/tsx/dist/loader.mjs");
const temporaryRoots: string[] = [];

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

const runSessionStart = (cwd: string): Promise<CliResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", tsxLoader, mainPath, "hook", "session-start"], {
      cwd,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`SessionStart timed out\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, 30_000);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.end(JSON.stringify({ hook_event_name: "SessionStart" }));
  });

const prepareConfiguredRoot = async (enabled: boolean, invalidDeclarations = false): Promise<string> => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "session-start-world-"));
  temporaryRoots.push(rootDir);
  const config = JSON.parse(await readFile(path.join(harnessRoot, "phasegate.config.json"), "utf8")) as {
    world: { enabled: boolean };
  };
  config.world.enabled = enabled;
  await writeFile(path.join(rootDir, "phasegate.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  if (invalidDeclarations) {
    await writeFile(
      path.join(rootDir, "phasegate.world-constraints.json"),
      '{"schemaVersion":"phasegate-world-constraints/v999","constraints":[],"aliases":[]}\n',
      "utf8",
    );
  }
  return rootDir;
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((rootDir) => rm(rootDir, { recursive: true, force: true })));
});

describe("SessionStart World obligations", () => {
  it("self-repoのadopted legacy 604件を一行だけに集約すること", async () => {
    // Arrange / Act
    const actual = await runSessionStart(harnessRoot);

    // Assert
    expect(actual.exitCode, actual.stderr).toBe(0);
    const context = JSON.parse(actual.stdout).hookSpecificOutput.additionalContext as string;
    expect(context).toContain("Adopted legacy: 604 (summary only)");
    expect(context).not.toContain("pgw:v1:violation-fingerprint");
  }, 60_000);

  it("world無効時はWorld sectionを追加しないこと", async () => {
    // Arrange
    const rootDir = await prepareConfiguredRoot(false);

    // Act
    const actual = await runSessionStart(rootDir);

    // Assert
    expect(actual.exitCode, actual.stderr).toBe(0);
    expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).not.toContain("World open obligations");
  });

  it("derive不能時はrepository textなしの固定警告でfail-openすること", async () => {
    // Arrange
    const rootDir = await prepareConfiguredRoot(true, true);

    // Act
    const actual = await runSessionStart(rootDir);

    // Assert
    expect(actual.exitCode, actual.stderr).toBe(0);
    const context = JSON.parse(actual.stdout).hookSpecificOutput.additionalContext as string;
    expect(context).toContain(
      "⚠ World obligations unavailable at SessionStart; continuing fail-open. Run phasegate world:derive.",
    );
    expect(context).not.toContain("phasegate-world-constraints/v999");
  });
});
