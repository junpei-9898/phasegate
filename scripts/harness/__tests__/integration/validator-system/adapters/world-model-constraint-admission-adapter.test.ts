// @unit validator-system
// @layer integration-test
// @work-item-id WI-301
// @story H17-14
// @ac H17-14-3
// @ac H17-14-4
// @ac H17-14-5
// @ac H17-14-6

import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { WorldModelConstraintAdmissionAdapter } from "../../../../validator-system/infrastructure/adapters/world-model-constraint-admission-adapter.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const baseFixture = path.resolve(here, "../../../fixtures/world-model/synthetic-mutations/base");
const temporaryRoots: string[] = [];
const digest = (character: string): string => `sha256:${character.repeat(64)}`;

const prepareRoot = async (): Promise<string> => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "world-l2-admission-"));
  temporaryRoots.push(rootDir);
  await cp(baseFixture, rootDir, { recursive: true });
  for (const directory of [
    "docs/product/units",
    "docs/product/construction",
    "docs/inception",
    "docs/ADR",
    "scripts/harness/__tests__",
    ".harness",
  ]) {
    await mkdir(path.join(rootDir, directory), { recursive: true });
  }
  return rootDir;
};

const writeConstraints = async (rootDir: string, constraints: readonly unknown[]): Promise<void> => {
  await writeFile(
    path.join(rootDir, "phasegate.world-constraints.json"),
    `${JSON.stringify({ schemaVersion: "phasegate-world-constraints/v1", constraints, aliases: [] }, null, 2)}\n`,
    "utf8",
  );
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((rootDir) => rm(rootDir, { recursive: true, force: true })));
});

describe("World Model constraint admission adapter", () => {
  it("new unpinned claim fixtureをWCR-001 invalid declarationとして観測すること", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    await writeConstraints(rootDir, [
      {
        constraintId: "pgw:v1:constraint:world.unpinned-fixture",
        factType: "references",
        claimant: { nodeId: "pgw:v1:source-file:scripts/harness/sample/domain/claimant.ts" },
        premise: {
          nodeId: "pgw:v1:source-file:scripts/harness/sample/domain/premise.ts",
          contentDigest: digest("a"),
        },
        applicableRuleIds: ["WCR-002", "WCR-008"],
      },
    ]);
    const adapter = new WorldModelConstraintAdmissionAdapter({ rootDir });

    // Act
    const actual = await adapter.collect();

    // Assert
    expect(actual.diagnostics).toEqual([]);
    expect(actual.obligations).toEqual([
      expect.objectContaining({ ruleId: "WCR-001", classification: "invalid-declaration" }),
    ]);
  });

  it("new duplicate fingerprintをbaseline採用後はadopted legacyとして観測すること", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    await writeConstraints(rootDir, []);
    await writeFile(
      path.join(rootDir, "docs/product/explicit-fragment-duplicate.md"),
      [
        "<!-- @world-fragment-id sample.shared-fragment -->",
        "# Duplicate explicit Fragment",
        "",
        "Second candidate.",
        "",
      ].join("\n"),
      "utf8",
    );
    const adapter = new WorldModelConstraintAdmissionAdapter({ rootDir });
    const candidate = await adapter.collect();
    const obligation = candidate.obligations.find((item) => item.ruleId === "WCR-005");
    expect(obligation).toBeDefined();
    await writeFile(
      path.join(rootDir, "phasegate.world-baseline.json"),
      `${JSON.stringify(
        {
          schemaVersion: "phasegate-world-adoption-baseline/v1",
          rulesetVersion: "phasegate-world-wcr/v1",
          sourceEvaluationId: `pgw:v1:evaluation:sha256:${"1".repeat(64)}`,
          sourceCorpusRoot: digest("2"),
          sourceConstraintRoot: digest("3"),
          adoptedByWorkItemId: "WI-301",
          adoptionReason: "Fixture proves legacy visibility without blocking",
          entries: [
            {
              violationFingerprint: obligation?.violationFingerprint,
              ruleId: "WCR-005",
              constraintId: null,
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    // Act
    const actual = await adapter.collect();

    // Assert
    expect(actual.obligations.find((item) => item.ruleId === "WCR-005")).toMatchObject({
      violationFingerprint: obligation?.violationFingerprint,
      classification: "adopted-legacy",
    });
  });

  it("unknown constraint schemaをconstraint-scoped diagnosticとしてfail-closed観測すること", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    await writeFile(
      path.join(rootDir, "phasegate.world-constraints.json"),
      '{"schemaVersion":"phasegate-world-constraints/v999","constraints":[],"aliases":[]}\n',
      "utf8",
    );
    const adapter = new WorldModelConstraintAdmissionAdapter({ rootDir });

    // Act
    const actual = await adapter.collect();

    // Assert
    expect(actual.obligations).toEqual([]);
    expect(actual.diagnostics).toEqual([
      expect.objectContaining({ code: "unsupported-schema-version", scope: "constraint" }),
    ]);
  });
});
