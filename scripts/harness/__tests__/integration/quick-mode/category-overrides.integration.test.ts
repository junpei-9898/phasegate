// @layer test
// @unit quick-mode
// @story H10-02
// @work-item-id WI-372
//
// quickMode.categoryOverrides が hook 経路 / check-change-category CLI 経路の
// 双方で一貫して効くことの統合テスト。
// override 未設定時に現行分類が維持されることも同時に固定する。

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HarnessConfigQuickModeConfigAdapter } from "../../../quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.js";
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

function runProcess(args: readonly string[], cwd: string, stdin?: string): Promise<CliResult> {
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
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

function createProjectRoot(
  categoryOverrides?: Record<string, string[]>,
  allowedCategories: string[] = ["bugfix", "docs", "test", "config"],
): string {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi372-"));
  const quickMode: Record<string, unknown> = {
    allowedCategories,
    maintainedLayers: ["L1"],
    relaxedGates: [],
  };
  if (categoryOverrides !== undefined) {
    quickMode["categoryOverrides"] = categoryOverrides;
  }
  writeFileSync(
    path.join(projectRoot, "phasegate.config.json"),
    `${JSON.stringify(
      {
        project: { name: "wi372", preset: "standard" },
        architecture: { preset: "clean" },
        layers: {},
        quickMode,
        phaseDependencies: { preset: "default", override: false, customRules: [] },
        planningMode: { default: "interactive", perPhase: {} },
        harnesses: {},
        baseline: { enabled: false },
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

target("quickMode.categoryOverrides の経路一貫性 (WI-372)", () => {
  target("HarnessConfigQuickModeConfigAdapter", () => {
    context("config に categoryOverrides が設定されている場合", () => {
      // IT-QMA-001
      it("QuickModeConfig の categoryOverrides に反映されること", async () => {
        // Arrange
        const projectRoot = createProjectRoot({ docs: ["results/**"] });
        const sut = new HarnessConfigQuickModeConfigAdapter(path.join(projectRoot, "phasegate.config.json"));

        // Act
        const actual = await sut.getQuickModeConfig();

        // Assert
        expect(actual.categoryOverrides.resolve("results/2026-08-06/a.md")?.toString()).toBe("docs");
      });
    });

    context("config に categoryOverrides が無い場合", () => {
      // IT-QMA-002
      it("空の categoryOverrides になり分類へ影響しないこと", async () => {
        // Arrange
        const projectRoot = createProjectRoot();
        const sut = new HarnessConfigQuickModeConfigAdapter(path.join(projectRoot, "phasegate.config.json"));

        // Act
        const actual = await sut.getQuickModeConfig();

        // Assert
        expect(actual.categoryOverrides.isEmpty()).toBe(true);
      });
    });
  });

  target("check-change-category CLI 経路", () => {
    describe("未存在パスの CREATE 推定に override が適用される", () => {
      // IT-OV-002
      it("'results/**' を docs に override した場合に perFile の category が docs になること", async () => {
        // Arrange
        const projectRoot = createProjectRoot({ docs: ["results/**"] });

        // Act
        const result = await runProcess(
          ["check-change-category", "--paths", "results/2026-08-06/summary.md", "--format", "json"],
          projectRoot,
        );
        const actual = JSON.parse(result.stdout) as {
          dominantCategory: string | null;
          fullModeRequired: boolean;
          perFile: { path: string; category: string }[];
        };

        // Assert
        expect(result.exitCode).toBe(0);
        expect(actual.perFile[0]?.category).toBe("docs");
        expect(actual.dominantCategory).toBe("docs");
        expect(actual.fullModeRequired).toBe(false);
      }, 60_000);

      it("override 未設定時は従来どおり feature に分類され Full Mode が必須になること", async () => {
        // Arrange
        const projectRoot = createProjectRoot();

        // Act
        const result = await runProcess(
          ["check-change-category", "--paths", "results/2026-08-06/summary.md", "--format", "json"],
          projectRoot,
        );
        const actual = JSON.parse(result.stdout) as {
          dominantCategory: string | null;
          fullModeRequired: boolean;
        };

        // Assert
        expect(actual.dominantCategory).toBe("feature");
        expect(actual.fullModeRequired).toBe(true);
      }, 60_000);
    });
  });

  target("pre-tool-use hook 経路", () => {
    describe("override 済みパスの新規 Write が Quick Mode で通過する", () => {
      // IT-OV-001
      it("'results/**' を docs に override した場合に hook が exit 0 で通過すること", async () => {
        // Arrange
        const projectRoot = createProjectRoot({ docs: ["results/**"] });
        const stdin = JSON.stringify({
          cwd: projectRoot,
          tool_name: "Write",
          tool_input: {
            file_path: path.join(projectRoot, "results/2026-08-06/summary.md"),
            content: "# summary\n",
          },
        });

        // Act
        const actual = await runProcess(["hook", "pre-tool-use"], projectRoot, stdin);

        // Assert
        expect(actual.stderr).not.toContain("Full mode 必須変更が検出されました");
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).toContain("category=docs");
      }, 60_000);
    });

    // @work-item-id WI-373
    describe("quickMode 設定が不正な場合は fail-closed になる", () => {
      // IT-OV-003
      it("allowedCategories に未知値がある config では docs の Write でもブロックされること", async () => {
        // Arrange: docs は本来許可カテゴリだが、config 自体が不正なので判定できない
        const projectRoot = createProjectRoot(undefined, ["bugfix", "typoo"]);
        const stdin = JSON.stringify({
          cwd: projectRoot,
          tool_name: "Write",
          tool_input: {
            file_path: path.join(projectRoot, "docs/guide/new.md"),
            content: "# new\n",
          },
        });

        // Act
        const actual = await runProcess(["hook", "pre-tool-use"], projectRoot, stdin);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain("quickMode 設定が不正なため");
      }, 60_000);
    });
  });
});
