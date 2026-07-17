// @unit harness-api
// @layer integration
// @story H08-01
// @work-item-id WI-314
// @work-item-id WI-330

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

function runCli(args: string[], cwd: string, stdin?: string): Promise<CliResult> {
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
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

// スキーマ違反 config: layers.L3.coverageThreshold は number のみ許容（GitHub #40 の実際の誘発値）
const INVALID_CONFIG = {
  project: { name: "invalid-config-repro", preset: "standard" },
  architecture: { preset: "clean" },
  quickMode: {},
  phaseDependencies: { preset: "standard", override: false, customRules: [] },
  planningMode: { default: "interactive", perPhase: {} },
  harnesses: {},
  layers: { L3: { coverageThreshold: null } },
  paths: { designDocs: "docs/product/construction", inceptionDocs: "docs/inception" },
  reporting: { format: "json", outputDir: "reports" },
};

async function makeInvalidConfigProject(): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-invalid-config-"));
  await writeFile(path.join(workDir, "phasegate.config.json"), JSON.stringify(INVALID_CONFIG, null, 2), "utf-8");
  return workDir;
}

target("不正 config での hook / doctor fail-open (GitHub #40)", () => {
  context("スキーマ違反の phasegate.config.json がある project で hook pre-tool-use を実行した場合", () => {
    it("書き込みを伴わない Bash ツールは警告付きで exit 0 になり全ツール遮断が起きないこと", async () => {
      // Arrange
      const workDir = await makeInvalidConfigProject();
      try {
        const stdin = JSON.stringify({
          cwd: workDir,
          tool_name: "Bash",
          tool_input: { command: "echo test" },
        });

        // Act
        const actual = await runCli(["hook", "pre-tool-use"], workDir, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).toContain("Invalid phasegate.config.json");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    it("phasegate.config.json 自身への Write は許可され自己修復経路が残ること", async () => {
      // Arrange
      const workDir = await makeInvalidConfigProject();
      try {
        const repaired = { ...INVALID_CONFIG, layers: {} };
        const stdin = JSON.stringify({
          cwd: workDir,
          tool_name: "Write",
          tool_input: {
            file_path: path.join(workDir, "phasegate.config.json"),
            content: JSON.stringify(repaired, null, 2),
          },
        });

        // Act
        const actual = await runCli(["hook", "pre-tool-use"], workDir, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("スキーマ違反の phasegate.config.json がある project で doctor を実行した場合", () => {
    it("exit 2 で即死せず、検証エラーを報告した上で診断が実行されること", async () => {
      // Arrange
      const workDir = await makeInvalidConfigProject();
      try {
        // Act
        const actual = await runCli(["doctor"], workDir);

        // Assert
        expect(actual.exitCode).not.toBe(2);
        expect(actual.stderr).toContain("Invalid phasegate.config.json");
        expect(actual.stderr).toContain("self-repair");
        expect(actual.stdout.length).toBeGreaterThan(0);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("スキーマ違反の phasegate.config.json がある project で validate を実行した場合", () => {
    it("検査系コマンドは fail-closed を維持し復旧手順付きで exit 2 になること", async () => {
      // Arrange
      const workDir = await makeInvalidConfigProject();
      try {
        // Act
        const actual = await runCli(["validate", "--layer", "L2"], workDir);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain("Invalid phasegate.config.json");
        expect(actual.stderr).toContain("Recovery");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  // WI-330: config **不在** 状態の実測固定。
  // 設計意図（ADR-038）は「hook は復旧経路として fail-open」だが、config 不在では
  // HarnessConfigConfigQueryAdapter.loadConfig() の readFileSync ENOENT が
  // hook-to-cli-translator.ts の getProtectedFilePatterns() 呼び出しから
  // pre-tool-use-hook.ts の outer catch まで素通りして exit 2 になる（既知ギャップ）。
  // invalid-json / invalid-schema では fail-open が機能するのに、missing だけ全ツール遮断
  // かつ config 自身への Write も遮断される（自己修復経路が閉じる）。
  // このテストは「あるべき姿」ではなく現状を固定するもの。挙動を修正する際は
  // agent-integration 側の修正とともに期待値を exit 0 へ反転させること。
  context("phasegate.config.json が存在しない project で hook pre-tool-use を実行した場合", () => {
    it("【現状固定・既知ギャップ】config 不在では書き込みを伴わない Bash も fail-closed の exit 2 で遮断されること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-missing-config-"));
      try {
        const stdin = JSON.stringify({
          cwd: workDir,
          tool_name: "Bash",
          tool_input: { command: "echo test" },
        });

        // Act
        const actual = await runCli(["hook", "pre-tool-use"], workDir, stdin);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain("ENOENT");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    it("【現状固定・既知ギャップ】config 不在では config 自身への Write も exit 2 で遮断され自己修復経路が閉じていること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-missing-config-"));
      try {
        const stdin = JSON.stringify({
          cwd: workDir,
          tool_name: "Write",
          tool_input: {
            file_path: path.join(workDir, "phasegate.config.json"),
            content: JSON.stringify({ project: { name: "recovered", preset: "standard" } }, null, 2),
          },
        });

        // Act
        const actual = await runCli(["hook", "pre-tool-use"], workDir, stdin);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain("ENOENT");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("phasegate.config.json が存在しない project で validate を実行した場合", () => {
    it("【現状固定】config 不在の validate は fail-open で既定設定により exit 0 になること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-missing-config-"));
      try {
        // Act
        const actual = await runCli(["validate", "--layer", "L2"], workDir);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("総合判定: PASS");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("phasegate.config.json が存在しない project で doctor を実行した場合", () => {
    it("config 不在の doctor は configStatus missing と config-status warn finding を報告すること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-missing-config-"));
      try {
        // Act
        const actual = await runCli(["doctor", "--json"], workDir);

        // Assert
        const payload = JSON.parse(actual.stdout) as {
          configStatus: string;
          findings: Array<{ checkId: string; severity: string }>;
        };
        expect(payload.configStatus).toBe("missing");
        expect(payload.findings).toContainEqual(
          expect.objectContaining({ checkId: "config-status", severity: "warn" }),
        );
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("config の JSON 構文自体が壊れている project で hook pre-tool-use を実行した場合", () => {
    it("既存の fail-open 挙動（警告 + 続行）が維持されること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-broken-json-"));
      try {
        await writeFile(path.join(workDir, "phasegate.config.json"), "{ broken", "utf-8");
        const stdin = JSON.stringify({
          cwd: workDir,
          tool_name: "Bash",
          tool_input: { command: "echo test" },
        });

        // Act
        const actual = await runCli(["hook", "pre-tool-use"], workDir, stdin);

        // Assert
        const configContent = await readFile(path.join(workDir, "phasegate.config.json"), "utf-8");
        expect(actual.exitCode).toBe(0);
        expect(configContent).toBe("{ broken");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });
});
