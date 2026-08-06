// @unit regression-suite
// @layer integration
// @work-item-id WI-307
// @work-item-id WI-312
// @work-item-id WI-383
// @story H17-19
// @ac H17-19-1
// @ac H17-19-2
// @ac H17-19-6

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

describe("production CI World trust chain", () => {
  it("coverage付きtest・E2E・matrix・derive・L3・attestation・integrityの順序を固定すること", () => {
    // Arrange
    const workflow = readFileSync(resolve(REPOSITORY_ROOT, ".github/workflows/ci.yml"), "utf-8");

    // Act
    const indexes = [
      workflow.indexOf("pnpm coverage"),
      workflow.indexOf("--dir scripts/harness/__tests__/e2e"),
      workflow.indexOf("phasegate:generate-matrix"),
      workflow.indexOf("World derive determinism"),
      workflow.indexOf("phasegate:ci-check --json"),
      workflow.indexOf("phasegate:attest --require-pass"),
      workflow.indexOf("phasegate:verify-attestation"),
      workflow.indexOf("integrity:verify"),
    ];

    // Assert
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
    expect(workflow.match(/pnpm coverage/g)).toHaveLength(1);
    expect(workflow).not.toContain("pnpm test");
  });

  it("deriveをpure modeで二回実行してraw bytesを比較すること", () => {
    // Arrange
    const workflow = readFileSync(resolve(REPOSITORY_ROOT, ".github/workflows/ci.yml"), "utf-8");
    const deriveInvocations = workflow.match(/world:derive --json/g) ?? [];

    // Act / Assert
    expect(deriveInvocations).toHaveLength(2);
    expect(workflow).toContain('cmp --silent "$FIRST" "$SECOND"');
    expect(workflow).not.toContain("world:derive --write");
  });

  it("threads coverage開始時にforks blobを削除せずmerge入力を保持すること", () => {
    // Arrange
    const manifest = readFileSync(resolve(REPOSITORY_ROOT, "package.json"), "utf-8");
    const threadsConfig = readFileSync(
      resolve(REPOSITORY_ROOT, "scripts/harness/__tests__/vitest.config.coverage.ts"),
      "utf-8",
    );

    // Act / Assert
    expect(manifest).toContain("coverage/.blob/forks.json");
    expect(manifest).toContain("coverage/.blob/threads.json");
    expect(manifest).toContain("--merge-reports=coverage/.blob");
    expect(threadsConfig).toContain("clean: false");
  });

  it("blob出力する両poolのcoverage実行に失敗詳細を出すreporterを併用すること", () => {
    // Arrange
    const manifest = readFileSync(resolve(REPOSITORY_ROOT, "package.json"), "utf-8");

    // Act
    const blobRuns = manifest.match(/--reporter=blob[^&]*/g) ?? [];

    // Assert
    expect(blobRuns.map((run) => run.includes("--reporter=default"))).toEqual([true, true]);
    expect(blobRuns.map((run) => run.match(/--outputFile\.blob=(\S+)/)?.[1])).toEqual([
      "coverage/.blob/forks.json",
      "coverage/.blob/threads.json",
    ]);
  });

  it("package manifestがCI template・schemas・guideを配布対象に含めること", () => {
    // Arrange
    const manifest = JSON.parse(readFileSync(resolve(REPOSITORY_ROOT, "package.json"), "utf-8")) as {
      files: readonly string[];
    };

    // Act / Assert
    expect(manifest.files).toEqual(expect.arrayContaining(["docs/contracts/**", "docs/guide/**", "docs/templates/**"]));
  });
});
