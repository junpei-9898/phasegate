// @unit harness-api
// @layer integration
// @story H13-04
// @work-item-id WI-385
// @work-item-id WI-212
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
  stderr: string;
}

interface InitLanguageResult {
  cli: CliResult;
  languages: readonly string[];
}

function runCli(args: string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", path.join(HARNESS_ROOT, "node_modules/tsx/dist/loader.mjs"), MAIN_TS, ...args],
      { cwd, env: process.env },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({ exitCode: code ?? -1, stderr });
    });
    child.stdin.end();
  });
}

async function runInitLanguageScenario(language: string): Promise<InitLanguageResult> {
  const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-init-language-"));
  try {
    const args = ["init", "--name", "foo", "--skills", "core", "--agent", "codex", "--language", language, "--yes"];
    const cli = await runCli(args, workDir);
    const config = JSON.parse(await readFile(path.join(workDir, "phasegate.config.json"), "utf-8"));
    return { cli, languages: config.project.languages };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

target("phasegate init language flag", () => {
  context("--language を指定する場合", () => {
    it("生成 config に project.languages を書くこと", async () => {
      // Arrange
      const language = "python";

      // Act
      const actual = await runInitLanguageScenario(language);

      // Assert
      expect(actual.cli).toEqual(expect.objectContaining({ exitCode: 0 }));
      expect(actual.cli.stderr).not.toContain("unknown flag");
      expect(actual.languages).toEqual(["python"]);
    }, 120000);
  });
});
