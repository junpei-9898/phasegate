// @unit installation
// @layer integration
// @story H11-01
// @work-item-id WI-316

import { spawn } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { context, target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", MAIN_TS, ...args], { cwd, env: process.env });
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

async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

let workDir: string | null = null;

async function createTempProject(prefix: string): Promise<string> {
  workDir = await mkdtemp(path.join(tmpdir(), prefix));
  await writeFile(
    path.join(workDir, "package.json"),
    JSON.stringify({ name: "install-flag-wiring-fixture", version: "0.0.0", private: true }, null, 2),
    "utf8",
  );
  return workDir;
}

afterEach(async () => {
  if (workDir) {
    await rm(workDir, { recursive: true, force: true });
    workDir = null;
  }
});

target("phasegate install の --with-husky / --with-ci フラグ配線 (WI-316)", () => {
  context("フラグなしの install --apply は Husky / CI ターゲットを書き込まない", () => {
    it("install --apply（フラグなし）では .husky/ と .github/workflows/ が作成されないこと", async () => {
      // Arrange
      const root = await createTempProject("phasegate-install-noflags-");

      // Act
      const actual = await runCli(["install", "--apply", "--agent", "claude", "--skills", "core", "--json"], root);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(await fileExists(path.join(root, ".husky"))).toBe(false);
      expect(await fileExists(path.join(root, ".github/workflows"))).toBe(false);
      expect(await fileExists(path.join(root, ".phasegate/manifest.json"))).toBe(true);
    }, 60000);
  });

  context("--with-husky と --with-ci を指定した install --apply は両ターゲットを書き込む", () => {
    it("install --apply --with-husky --with-ci では .husky/pre-commit と phasegate-aidlc-gate.yml が作成されること", async () => {
      // Arrange
      const root = await createTempProject("phasegate-install-withflags-");

      // Act
      const actual = await runCli(
        ["install", "--apply", "--agent", "claude", "--skills", "core", "--with-husky", "--with-ci", "--json"],
        root,
      );

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(await fileExists(path.join(root, ".husky/pre-commit"))).toBe(true);
      expect(await fileExists(path.join(root, ".husky/commit-msg"))).toBe(true);
      expect(await fileExists(path.join(root, ".github/workflows/phasegate-aidlc-gate.yml"))).toBe(true);
    }, 60000);
  });
});
