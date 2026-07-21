/**
 * @layer e2e-test
 * @unit harness-api
 * @story H08-01
 * @work-item-id WI-342
 *
 * validate --layer の実行時入力検証を実 CLI 経路で確認する。
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd());
const MAIN = resolve(dirname(fileURLToPath(import.meta.url)), "../../main.ts");
const TSX_LOADER = createRequire(import.meta.url).resolve("tsx");

function run(...args: string[]) {
  const actual = spawnSync(process.execPath, ["--import", TSX_LOADER, MAIN, ...args], {
    cwd: ROOT,
    encoding: "utf-8",
    env: { ...process.env, NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 90_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    stdout: actual.stdout?.trim() ?? "",
    stderr: actual.stderr?.trim() ?? "",
    exitCode: actual.status ?? 2,
  };
}

describe("validate --layer の入力を検証する", () => {
  it("validate --layer に L9 を指定すると有効値一覧を stderr に出して exit 2 で終了する", () => {
    // Arrange
    const args = ["validate", "--layer", "L9"] as const;

    // Act
    const actual = run(...args);

    // Assert
    expect(actual.exitCode).toBe(2);
    expect(actual.stderr).toContain("不正な --layer 値: L9");
    expect(actual.stderr).toContain("有効値: L0, L2, L3, L4, all");
  }, 60_000);

  it("validate --layer に L1 を指定すると lint コマンドの案内を stderr に出して exit 2 で終了する", () => {
    // Arrange
    const args = ["validate", "--layer", "L1"] as const;

    // Act
    const actual = run(...args);

    // Assert
    expect(actual.exitCode).toBe(2);
    expect(actual.stderr).toContain("有効値: L0, L2, L3, L4, all");
    expect(actual.stderr).toContain("L1 は `npx phasegate lint` で実行してください");
  }, 60_000);

  it("validate --layer に L2 を指定すると不正値エラーにならず従来どおり実行する", () => {
    // Arrange
    const args = ["validate", "--layer", "L2"] as const;

    // Act
    const actual = run(...args);

    // Assert
    expect(actual.stderr).not.toContain("不正な --layer 値");
    expect([0, 1]).toContain(actual.exitCode);
  }, 60_000);
});
