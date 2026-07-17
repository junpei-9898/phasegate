/**
 * @layer e2e-test
 * @unit installation
 * @story H11-01
 * @work-item-id WI-329
 *
 * 実分布リリースゲート (release-smoke)。
 *
 * npm pack した tarball を実分布相当の fixture リポ（pure-python / go-monorepo /
 * docs-only）にクリーンインストールし、主要コマンド（install / doctor /
 * validate / uninstall）を実走する。単体テスト全 green でもすり抜けた
 * 「新規インストール即クラッシュ (#34)」「非 TS リポで fail-closed (#37/#39)」
 * 「dead flag (#36)」型の実分布欠陥を検知することが目的。
 *
 * tarball インストールは npm registry へのネットワークアクセスを伴い、
 * 通常 suite の hermetic 性を壊すため、PHASEGATE_RELEASE_SMOKE=1 が
 * 設定された場合のみ実行される（CI では専用 job release-smoke が担う）。
 * tarball パスは PHASEGATE_TARBALL で注入でき、未指定なら beforeAll で
 * `npm pack` を自走して生成する。
 *
 * 検証レベルは「クラッシュしない・案内どおり動く」に留め、
 * 出力の細部（メッセージ文言・件数）には固定しない。
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const RELEASE_SMOKE_ENABLED = process.env.PHASEGATE_RELEASE_SMOKE === "1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");
const FIXTURES_ROOT = resolve(REPO_ROOT, "scripts/harness/__tests__/fixtures/release-smoke");

const SPAWN_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 300_000;
const MAX_BUFFER = 10 * 1024 * 1024;

/**
 * vitest 実行環境（pnpm 経由）の npm_config_* / PNPM_* が fixture 側の
 * npm install に漏れると解決先やライフサイクルが歪むため落として渡す。
 */
function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(npm_|PNPM_|VITEST)/i.test(key)) continue;
    env[key] = value;
  }
  return env;
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCommand(command: string, args: string[], cwd: string): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf-8",
    env: cleanEnv(),
    stdio: ["ignore", "pipe", "pipe"],
    timeout: SPAWN_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
  });
  if (result.error) {
    throw new Error(`spawn failed: ${command} ${args.join(" ")} — ${result.error.message}`);
  }
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? -1,
  };
}

/** インストール済み fixture 内の phasegate bin を直接実行する（#34 型の bin 配線も検証対象）。 */
function runPhasegate(projectDir: string, ...args: string[]): CommandResult {
  return runCommand(join(projectDir, "node_modules/.bin/phasegate"), args, projectDir);
}

/** fixture を temp dir へコピーし、package.json が無ければ最小のものを書く（npm init -y 相当）。 */
function materializeFixture(fixtureName: string): string {
  const projectDir = mkdtempSync(join(tmpdir(), `phasegate-release-smoke-${fixtureName}-`));
  cpSync(join(FIXTURES_ROOT, fixtureName), projectDir, { recursive: true });
  const packageJsonPath = join(projectDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    writeFileSync(
      packageJsonPath,
      `${JSON.stringify({ name: `release-smoke-${fixtureName}`, version: "0.0.0", private: true }, null, 2)}\n`,
      "utf-8",
    );
  }
  return projectDir;
}

describe.skipIf(!RELEASE_SMOKE_ENABLED)("release-smoke: tarball 実分布ゲート (WI-329)", () => {
  let tarballPath = "";
  let packTempDir: string | null = null;
  const projectDirs: string[] = [];

  beforeAll(() => {
    const fromEnv = process.env.PHASEGATE_TARBALL;
    if (fromEnv) {
      tarballPath = resolve(fromEnv);
      if (!existsSync(tarballPath)) {
        throw new Error(`PHASEGATE_TARBALL points to a missing file: ${tarballPath}`);
      }
      return;
    }
    packTempDir = mkdtempSync(join(tmpdir(), "phasegate-release-smoke-pack-"));
    const packed = runCommand("npm", ["pack", "--pack-destination", packTempDir], REPO_ROOT);
    if (packed.exitCode !== 0) {
      throw new Error(`npm pack failed (exit ${packed.exitCode}): ${packed.stderr}`);
    }
    const tarball = readdirSync(packTempDir).find((name) => name.endsWith(".tgz"));
    if (!tarball) {
      throw new Error(`npm pack produced no .tgz in ${packTempDir}`);
    }
    tarballPath = join(packTempDir, tarball);
  }, TEST_TIMEOUT_MS);

  afterAll(() => {
    for (const dir of projectDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    if (packTempDir) {
      rmSync(packTempDir, { recursive: true, force: true });
    }
  });

  for (const fixtureName of ["pure-python", "go-monorepo", "docs-only"] as const) {
    describe(`release-smoke fixture: ${fixtureName}`, () => {
      let projectDir = "";

      beforeAll(() => {
        projectDir = materializeFixture(fixtureName);
        projectDirs.push(projectDir);
      });

      it(
        `release-smoke(${fixtureName}): npm install で tarball が exit 0 でインストールされ phasegate bin が配置されること`,
        () => {
          // Arrange — beforeAll で fixture を temp dir に展開済み

          // Act
          const actual = runCommand("npm", ["install", "--no-audit", "--no-fund", tarballPath], projectDir);

          // Assert
          expect(actual.exitCode, actual.stderr).toBe(0);
          expect(existsSync(join(projectDir, "node_modules/.bin/phasegate"))).toBe(true);
        },
        TEST_TIMEOUT_MS,
      );

      it(
        `release-smoke(${fixtureName}): install --apply --agent claude が exit 0 かつデフォルトで Husky / CI workflow を書き込まないこと`,
        () => {
          // Arrange — 直前ケースで tarball インストール済み

          // Act
          const actual = runPhasegate(projectDir, "install", "--apply", "--agent", "claude");

          // Assert
          expect(actual.exitCode, actual.stderr).toBe(0);
          expect(existsSync(join(projectDir, ".husky"))).toBe(false);
          expect(existsSync(join(projectDir, ".github/workflows/phasegate-aidlc-gate.yml"))).toBe(false);
          expect(existsSync(join(projectDir, "phasegate.config.json"))).toBe(true);
        },
        TEST_TIMEOUT_MS,
      );

      it(
        `release-smoke(${fixtureName}): doctor --json がクラッシュせず JSON を返すこと`,
        () => {
          // Arrange — install --apply 済みプロジェクト

          // Act
          const actual = runPhasegate(projectDir, "doctor", "--json");

          // Assert — 診断結果 red (exit 1) は許容。exit 2 / 非 JSON 出力（クラッシュ）は fail
          expect([0, 1], `exit=${actual.exitCode} stderr=${actual.stderr}`).toContain(actual.exitCode);
          expect(() => JSON.parse(actual.stdout)).not.toThrow();
        },
        TEST_TIMEOUT_MS,
      );

      it(
        `release-smoke(${fixtureName}): validate --layer L2 --json が config エラー (exit 2) にならず JSON を返すこと`,
        () => {
          // Arrange — install --apply 済みプロジェクト

          // Act
          const actual = runPhasegate(projectDir, "validate", "--layer", "L2", "--json");

          // Assert — 違反検出 (exit 1) は許容。#37/#39 型の fail-closed (exit 2) は fail
          expect(actual.exitCode, `stderr=${actual.stderr}`).not.toBe(2);
          expect([0, 1]).toContain(actual.exitCode);
          const parsed = JSON.parse(actual.stdout);
          if (fixtureName === "pure-python") {
            // 言語検出により TS 系 validator は SKIP される（fail-closed しない）
            expect(parsed.skippedValidators).toBeGreaterThanOrEqual(1);
          }
        },
        TEST_TIMEOUT_MS,
      );

      it(
        `release-smoke(${fixtureName}): uninstall --apply がクラッシュせず、--force 再実行で install 産物が撤去されること`,
        () => {
          // Arrange — install --apply 済みプロジェクト

          // Act — 保護対象を含むため plain --apply は拒否 (exit 1) が正常系。案内どおり --force で再実行する
          const plain = runPhasegate(projectDir, "uninstall", "--apply");
          const actual = runPhasegate(projectDir, "uninstall", "--apply", "--force");

          // Assert
          expect([0, 1], `plain uninstall exit=${plain.exitCode} stderr=${plain.stderr}`).toContain(plain.exitCode);
          expect(actual.exitCode, actual.stderr).toBe(0);
          expect(existsSync(join(projectDir, "phasegate.config.json"))).toBe(false);
          expect(existsSync(join(projectDir, ".claude/settings.json"))).toBe(false);
          expect(existsSync(join(projectDir, "skills"))).toBe(false);
        },
        TEST_TIMEOUT_MS,
      );
    });
  }

  describe("release-smoke: install フラグ有効性", () => {
    let projectDir = "";

    beforeAll(() => {
      projectDir = materializeFixture("docs-only");
      projectDirs.push(projectDir);
    });

    it(
      "release-smoke(flag): install --apply --with-husky で .husky/pre-commit が作成されること（dead flag 検知）",
      () => {
        // Arrange
        const installed = runCommand("npm", ["install", "--no-audit", "--no-fund", tarballPath], projectDir);
        expect(installed.exitCode, installed.stderr).toBe(0);

        // Act
        const actual = runPhasegate(projectDir, "install", "--apply", "--agent", "claude", "--with-husky");

        // Assert
        expect(actual.exitCode, actual.stderr).toBe(0);
        expect(existsSync(join(projectDir, ".husky/pre-commit"))).toBe(true);
      },
      TEST_TIMEOUT_MS,
    );
  });
});
