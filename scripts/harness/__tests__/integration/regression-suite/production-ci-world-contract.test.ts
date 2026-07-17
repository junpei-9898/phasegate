// @unit regression-suite
// @layer integration
// @work-item-id WI-307
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
  it("test・matrix・derive・L3・attestation・integrityの順序を固定すること", () => {
    // Arrange
    const workflow = readFileSync(resolve(REPOSITORY_ROOT, ".github/workflows/ci.yml"), "utf-8");

    // Act
    const indexes = [
      workflow.indexOf("pnpm test"),
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

  it("package manifestがCI template・schemas・guideを配布対象に含めること", () => {
    // Arrange
    const manifest = JSON.parse(readFileSync(resolve(REPOSITORY_ROOT, "package.json"), "utf-8")) as {
      files: readonly string[];
    };

    // Act / Assert
    expect(manifest.files).toEqual(expect.arrayContaining(["docs/contracts/**", "docs/guide/**", "docs/templates/**"]));
  });
});
