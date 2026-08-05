// @layer test
// @unit harness-api
// @story H11-02
// @work-item-id WI-348

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ChangeCategory } from "../../../quick-mode/domain/value-objects/change-category.js";
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

function runCli(args: readonly string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, ["--import", TSX_IMPORT, MAIN_TS, ...args], { cwd, env: process.env });
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
  });
}

target("phasegate session begin の allowedCategories 語彙", () => {
  context("Full Mode session を開始した場合", () => {
    it("書き出される allowedCategories が ChangeCategory 語彙のみで構成され feature / api を含むこと", async () => {
      // Arrange
      const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi348-session-"));

      // Act
      const result = await runCli(
        [
          "session",
          "begin",
          "--mode",
          "full",
          "--unit",
          "agent-integration",
          "--work-item",
          "WI-348",
          "--reason",
          "vocabulary regression",
          "--duration",
          "1h",
          "--json",
        ],
        projectRoot,
      );
      const payload = JSON.parse(result.stdout) as {
        ok: boolean;
        session: { allowedCategories: string[] };
      };
      const actual = payload.session.allowedCategories;

      // Assert
      expect(result.exitCode).toBe(0);
      expect(payload.ok).toBe(true);
      for (const category of actual) {
        expect(() => ChangeCategory.fromString(category)).not.toThrow();
      }
      expect(actual).toContain("feature");
      expect(actual).toContain("api");
      expect(actual).toContain("bugfix");
    }, 30_000);
  });
});
