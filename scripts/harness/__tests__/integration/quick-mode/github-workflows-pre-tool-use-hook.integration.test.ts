// @layer test
// @unit quick-mode
// @work-item-id WI-334
//
// pre-tool-use hook 経由で .github/workflows/*.yml の新規 Write が
// quick-mode（config 許容）下でブロックされないことの回帰テスト。
// 以前は CREATE がフォールバックで 'feature'（構成不能な拒否カテゴリ）に分類され、
// unit を持たない .github/ では案内される story-implementor 経路も完遂不能だった。

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runHook(stdin: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", MAIN_TS, "hook", "pre-tool-use"], {
      cwd: HARNESS_ROOT,
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
    child.on("exit", (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.write(stdin);
    child.stdin.end();
  });
}

function createProjectRoot(): string {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi334-hook-"));
  writeFileSync(
    path.join(projectRoot, "phasegate.config.json"),
    `${JSON.stringify(
      {
        project: { name: "wi334-hook", preset: "standard" },
        architecture: { preset: "clean" },
        layers: {},
        quickMode: {
          allowedCategories: ["bugfix", "docs", "test", "config"],
          relaxedGates: [],
        },
        phaseDependencies: { preset: "default", override: false, customRules: [] },
        planningMode: { default: "interactive", perPhase: {} },
        harnesses: {},
        paths: {
          designDocs: "docs/product/construction",
          inceptionDocs: "docs/inception",
        },
        reporting: { format: "json", outputDir: "reports" },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return projectRoot;
}

target("pre-tool-use hook × .github/workflows 分類 (WI-334)", () => {
  describe("CI workflow の新規 Write が quick-mode（config 許容）で通過する", () => {
    it("存在しない .github/workflows/*.yml への Write が pre-tool-use hook にブロックされず exit 0 で通過すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const stdin = JSON.stringify({
        cwd: projectRoot,
        tool_name: "Write",
        tool_input: {
          file_path: path.join(projectRoot, ".github/workflows/new-ci.yml"),
          content: "name: ci\non: [push]\njobs: {}\n",
        },
      });

      // Act
      const actual = await runHook(stdin);

      // Assert: 以前は CREATE→feature 分類で 'Full mode 必須変更が検出されました' の exit 2 だった
      expect(actual.stderr).not.toContain("Full mode 必須変更が検出されました");
      expect(actual.exitCode).toBe(0);
      expect(actual.stderr).toContain("write allowed (Quick Mode");
      expect(actual.stderr).toContain("category=config");
    }, 60000);
  });
});
