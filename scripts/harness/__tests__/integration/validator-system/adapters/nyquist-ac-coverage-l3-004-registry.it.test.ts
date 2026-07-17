// @unit validator-system
// @layer integration
// @story H08-02
// @work-item-id WI-324

/**
 * L3-004（AC網羅ゲート）の REAL registry + matrix-path 配線に対する回帰テスト。
 *
 * かつての欠陥:
 *  1. story registry が空スタブ（getStoryIds: () => []）→ 正当・完全網羅の
 *     マトリクスでも全 storyId が「未登録」判定になり L3-004 が PASS 不能だった。
 *  2. matrix path が config から供給されず '' 既定 → readFile('') が ENOENT で
 *     必ず fail-closed していた。
 *
 * 本テストは phasegate:ci-check --json を temp cwd で実行し、config・user_stories.md・
 * requirement-test-matrix.json を配置したうえで L3-004 の per-validator 結果を検証する。
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { context, target } from "../../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");
const SCHEMA_SRC = path.join(HARNESS_ROOT, "docs/contracts/requirement-test-matrix.schema.json");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: readonly string[], cwd: string): Promise<CliResult> {
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

interface ValidatorResult {
  validatorId: string;
  passed: boolean;
  skipped: boolean;
  errors: readonly { code: string; message: string }[];
}

function parseValidatorResults(stdout: string): ValidatorResult[] {
  const parsed = JSON.parse(stdout) as { data: { validatorResults: ValidatorResult[] } };
  return parsed.data.validatorResults;
}

function findL3004(stdout: string): ValidatorResult {
  const result = parseValidatorResults(stdout).find((r) => r.validatorId === "L3-004");
  if (!result) throw new Error("L3-004 result not found");
  return result;
}

interface FixtureOptions {
  readonly storyIds: readonly string[];
  readonly matrix: object | null;
  readonly requirementMatrixPath?: string;
  readonly l3Validators?: readonly string[];
  /** WI-324: true のとき user_stories.md 自体を配置しない（phasegate 導入直後のフレッシュプロジェクトを模擬）。 */
  readonly omitStoryCatalog?: boolean;
}

const BASE_CONFIG = {
  project: { name: "l3-004-fixture", preset: "standard" },
  architecture: { preset: "clean" },
  quickMode: {},
  phaseDependencies: { preset: "standard", override: false, customRules: [] },
  planningMode: { default: "interactive", perPhase: {} },
  harnesses: {},
  paths: { designDocs: "docs/product/construction", inceptionDocs: "docs/inception" },
  reporting: { format: "json", outputDir: "reports" },
} as const;

async function setupFixture(options: FixtureOptions): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-l3-004-"));

  const l3Config: Record<string, unknown> = {};
  if (options.l3Validators) l3Config.validators = [...options.l3Validators];
  if (options.requirementMatrixPath) l3Config.requirementMatrixPath = options.requirementMatrixPath;

  const config = {
    ...BASE_CONFIG,
    layers: {
      // L3 のみ検証対象にする。coverageThreshold=0 で L3-003 のカバレッジ判定を無効化し、
      // L3-004 の挙動を独立に検証できるようにする。
      L1: { enabled: false },
      L2: { enabled: false },
      L3: { enabled: true, coverageThreshold: 0, ...l3Config },
      L4: { enabled: false },
    },
  };
  await writeFile(path.join(workDir, "phasegate.config.json"), JSON.stringify(config, null, 2), "utf-8");

  // user_stories.md（story catalog）を配置。designDocs=docs/product/construction のため
  // productDocsRoot は docs/product、catalog は docs/product/user_stories.md。
  // omitStoryCatalog=true（WI-324 フレッシュプロジェクト模擬）の場合は配置しない。
  await mkdir(path.join(workDir, "docs/product"), { recursive: true });
  if (!options.omitStoryCatalog) {
    const storyLines = options.storyIds.map((id) => `- ${id}: サンプルストーリー`).join("\n");
    await writeFile(path.join(workDir, "docs/product/user_stories.md"), `# User Stories\n\n${storyLines}\n`, "utf-8");
  }

  // matrix schema はプロジェクトルート基準（docs/contracts/...）で読まれるため temp にコピーする。
  await mkdir(path.join(workDir, "docs/contracts"), { recursive: true });
  const { readFile } = await import("node:fs/promises");
  const schemaRaw = await readFile(SCHEMA_SRC, "utf-8");
  await writeFile(path.join(workDir, "docs/contracts/requirement-test-matrix.schema.json"), schemaRaw, "utf-8");

  if (options.matrix !== null) {
    const matrixPath = options.requirementMatrixPath ?? ".harness/requirement-test-matrix.json";
    const abs = path.join(workDir, matrixPath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, JSON.stringify(options.matrix, null, 2), "utf-8");
  }

  return workDir;
}

function coveredMatrix(storyId: string): object {
  return {
    version: "1.0.0",
    generatedAt: "2026-07-04T00:00:00.000Z",
    stories: [
      {
        storyId,
        storyMappings: [
          {
            acId: "AC-1",
            testReferences: [{ filePath: "scripts/harness/__tests__/unit/sample.test.ts", testType: "unit" }],
          },
        ],
      },
    ],
  };
}

target("L3-004 AC網羅ゲート — REAL registry + matrix-path 配線", () => {
  context("storyIdがカタログに登録され全ACがテスト網羅されている場合", () => {
    it("L3-004 が PASS すること（空スタブ回帰防止）", async () => {
      // Arrange
      const workDir = await setupFixture({
        storyIds: ["H07-01"],
        matrix: coveredMatrix("H07-01"),
      });

      // Act
      try {
        const cli = await runCli(["phasegate:ci-check", "--json"], workDir);
        const actual = findL3004(cli.stdout);

        // Assert
        expect(actual.skipped).toBe(false);
        expect(actual.passed).toBe(true);
        expect(actual.errors).toEqual([]);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 90000);
  });

  context("storyIdがカタログに未登録の場合", () => {
    it("L3-004 が FAIL し「未登録のstoryId」エラーを返すこと", async () => {
      // Arrange
      const workDir = await setupFixture({
        storyIds: ["H07-01"],
        matrix: coveredMatrix("H99-99"),
      });

      // Act
      try {
        const cli = await runCli(["phasegate:ci-check", "--json"], workDir);
        const actual = findL3004(cli.stdout);

        // Assert
        expect(actual.skipped).toBe(false);
        expect(actual.passed).toBe(false);
        expect(actual.errors.some((e) => /未登録のstoryId/.test(e.message))).toBe(true);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 90000);
  });

  context("登録済みstoryIdだがACがテスト未網羅の場合", () => {
    it("L3-004 が FAIL し「AC not covered」エラーを返すこと", async () => {
      // Arrange
      const uncovered = {
        version: "1.0.0",
        generatedAt: "2026-07-04T00:00:00.000Z",
        stories: [{ storyId: "H07-01", storyMappings: [{ acId: "AC-1", testReferences: [] }] }],
      };
      const workDir = await setupFixture({ storyIds: ["H07-01"], matrix: uncovered });

      // Act
      try {
        const cli = await runCli(["phasegate:ci-check", "--json"], workDir);
        const actual = findL3004(cli.stdout);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors.some((e) => /AC not covered/.test(e.message))).toBe(true);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 90000);
  });

  context("matrixファイルが不在の場合", () => {
    it("L3-004 が fail-closed になり、兄弟バリデータ(L3-001)は実行され続けること", async () => {
      // Arrange
      const workDir = await setupFixture({ storyIds: ["H07-01"], matrix: null });

      // Act
      try {
        const cli = await runCli(["phasegate:ci-check", "--json"], workDir);
        const results = parseValidatorResults(cli.stdout);
        const l3004 = results.find((r) => r.validatorId === "L3-004");
        const l3001 = results.find((r) => r.validatorId === "L3-001");

        // Assert
        // WI-324: story が存在する限り matrix 不在は SKIP されず fail-closed のまま
        expect(l3004?.skipped).toBe(false);
        expect(l3004?.passed).toBe(false);
        expect(l3004?.errors.some((e) => /見つかりません/.test(e.message))).toBe(true);
        // 兄弟バリデータ（L3-001）はバッチが落ちずに実行される
        expect(l3001).toBeDefined();
        expect(l3001?.passed).toBe(true);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 90000);
  });

  context("config の requirementMatrixPath でカスタムパスを指定する場合", () => {
    it("指定パスの matrix が読まれ L3-004 が PASS すること", async () => {
      // Arrange
      const customPath = "config/custom-matrix.json";
      const workDir = await setupFixture({
        storyIds: ["H07-01"],
        matrix: coveredMatrix("H07-01"),
        requirementMatrixPath: customPath,
      });

      // Act
      try {
        const cli = await runCli(["phasegate:ci-check", "--json"], workDir);
        const actual = findL3004(cli.stdout);

        // Assert
        expect(actual.skipped).toBe(false);
        expect(actual.passed).toBe(true);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 90000);
  });

  context("フレッシュプロジェクトの場合（story catalog 不在・matrix 不在。WI-324）", () => {
    it("L3-004 が fail-closed にならず skipped=true で返ること", async () => {
      // Arrange
      const workDir = await setupFixture({ storyIds: [], matrix: null, omitStoryCatalog: true });

      // Act
      try {
        const cli = await runCli(["phasegate:ci-check", "--json"], workDir);
        const actual = findL3004(cli.stdout);

        // Assert
        expect(actual.skipped).toBe(true);
        expect(actual.passed).toBe(true);
        expect(actual.errors ?? []).toEqual([]);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 90000);
  });

  context("story catalog は存在するが story がゼロ件で matrix も不在の場合（WI-324）", () => {
    it("L3-004 が story ゼロ判定により skipped=true で返ること", async () => {
      // Arrange
      const workDir = await setupFixture({ storyIds: [], matrix: null });

      // Act
      try {
        const cli = await runCli(["phasegate:ci-check", "--json"], workDir);
        const actual = findL3004(cli.stdout);

        // Assert
        expect(actual.skipped).toBe(true);
        expect(actual.passed).toBe(true);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 90000);
  });

  context("config の layers.L3.validators で L3-004 を除外する場合（per-repo scoping）", () => {
    it("L3-004 は実行されず skip されること", async () => {
      // Arrange
      const workDir = await setupFixture({
        storyIds: ["H07-01"],
        matrix: null,
        l3Validators: ["L3-001", "L3-002", "L3-003"],
      });

      // Act
      try {
        const cli = await runCli(["phasegate:ci-check", "--json"], workDir);
        const actual = findL3004(cli.stdout);

        // Assert
        expect(actual.skipped).toBe(true);
        expect(actual.passed).toBe(true);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 90000);
  });
});

// @story-id H08-07
