// @unit harness-api
// @layer integration
// @story H08-01
// @work-item-id WI-385
// @work-item-id WI-314
// @work-item-id WI-330
// @work-item-id WI-333

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
    const child = spawn(
      process.execPath,
      ["--import", path.join(HARNESS_ROOT, "node_modules/tsx/dist/loader.mjs"), MAIN_TS, ...args],
      { cwd, env: process.env },
    );
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

  // WI-333: config **不在**（missing）状態の fail-open（ADR-038 §4 G1 解消）。
  // 設計意図（ADR-038）どおり「hook は復旧経路として fail-open」を missing にも適用。
  // HarnessConfigConfigQueryAdapter.loadConfig() が ENOENT を警告 + 既定値で吸収するため、
  // 無関係 Bash / config 自身への Write は遮断されず自己修復経路が常に残る。
  // gated パス（scripts/harness/ 等）への書き込みは既定設定の phase-gate 判定が
  // fail-closed で効き続ける（fail-open は「遮断の解除」ではなく「既定設定への縮退」）。
  context("phasegate.config.json が存在しない project で hook pre-tool-use を実行した場合", () => {
    it("config 不在でも書き込みを伴わない Bash は警告付き fail-open の exit 0 で通過すること (WI-333)", async () => {
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
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).toContain("not found");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    it("config 不在でも config 自身への Write は exit 0 で許可され自己修復経路が開いていること (WI-333)", async () => {
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
        expect(actual.exitCode).toBe(0);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    it("config 不在でも gated パスへの Write は既定設定の phase-gate 判定で fail-closed に遮断されること (WI-333)", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-missing-config-"));
      try {
        const stdin = JSON.stringify({
          cwd: workDir,
          tool_name: "Write",
          tool_input: {
            file_path: path.join(workDir, "scripts/harness/some-unit/new-feature.ts"),
            content: "// @unit some-unit\n// @layer domain\nexport const x = 1;\n",
          },
        });

        // Act
        const actual = await runCli(["hook", "pre-tool-use"], workDir, stdin);

        // Assert: 意図したゲート判定での遮断（exit 2）であり、ENOENT クラッシュではないこと
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain("フェーズゲート違反");
        expect(actual.stderr).not.toContain("実行エラー");
        expect(actual.stderr).not.toContain("ENOENT");
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
