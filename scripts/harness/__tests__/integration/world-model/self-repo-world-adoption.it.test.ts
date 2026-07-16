// @unit world-model
// @layer integration
// @work-item-id WI-298
// @story H17-12
// @ac H17-12-1
// @ac H17-12-2
// @ac H17-12-3
// @ac H17-12-4
// @ac H17-12-5
// @ac H17-12-6

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../../../../..");
const mainPath = path.join(repositoryRoot, "scripts/harness/main.ts");
const tsxLoader = createRequire(import.meta.url).resolve("tsx");

interface BaselineDocument {
  readonly schemaVersion: string;
  readonly rulesetVersion: string;
  readonly sourceEvaluationId: string;
  readonly sourceCorpusRoot: string;
  readonly sourceConstraintRoot: string;
  readonly adoptedByWorkItemId: string;
  readonly adoptionReason: string;
  readonly entries: readonly {
    readonly violationFingerprint: string;
    readonly ruleId: string;
    readonly constraintId: string | null;
  }[];
}

interface DebtDocument {
  readonly schemaVersion: string;
  readonly debts: readonly {
    readonly debtId: string;
    readonly kind: string;
    readonly ownerUnit: string;
    readonly introducedByWorkItemId: string;
    readonly references: readonly string[];
  }[];
}

interface DeriveEnvelope {
  readonly schemaVersion: string;
  readonly command: string;
  readonly exitCode: number;
  readonly data: {
    readonly report: {
      readonly evaluationId: string;
      readonly rulesetVersion: string;
      readonly structuralObligations: readonly {
        readonly violationFingerprint: string;
        readonly ruleId: string;
        readonly constraintId: string | null;
        readonly classification: string;
      }[];
      readonly repaidBaselineEntries: readonly unknown[];
      readonly declaredSemanticDebts: readonly {
        readonly debtId: string;
        readonly kind: string;
        readonly ownerUnit: string;
        readonly introducedByWorkItemId: string;
        readonly references: readonly string[];
      }[];
      readonly policyDiagnostics: readonly unknown[];
    };
  };
}

const run = (...args: string[]) => {
  const actual = spawnSync(process.execPath, ["--import", tsxLoader, mainPath, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
    maxBuffer: 40 * 1024 * 1024,
  });
  return {
    exitCode: actual.status ?? 2,
    stdout: actual.stdout ?? "",
    stderr: actual.stderr ?? "",
  };
};

const sortedUnique = (values: readonly string[]): readonly string[] => [...new Set(values)].sort();

describe("Self-repo World adoption dogfood", () => {
  it("再生成matrixから二回byte-identicalにderiveしbaseline一致・増分ゼロ・exit 0にすること", () => {
    // Arrange
    const matrix = run("phasegate:generate-matrix");
    expect(matrix.exitCode, matrix.stderr).toBe(0);
    const baseline = JSON.parse(
      readFileSync(path.join(repositoryRoot, "phasegate.world-baseline.json"), "utf8"),
    ) as BaselineDocument;

    // Act
    const actualFirst = run("world:derive", "--json");
    const actualSecond = run("world:derive", "--json");

    // Assert
    expect(actualFirst.exitCode, actualFirst.stderr).toBe(0);
    expect(actualSecond.exitCode, actualSecond.stderr).toBe(0);
    expect(actualFirst.stdout).toBe(actualSecond.stdout);
    const envelope = JSON.parse(actualFirst.stdout) as DeriveEnvelope;
    const current = envelope.data.report.structuralObligations;
    const baselineFingerprints = baseline.entries.map((entry) => entry.violationFingerprint);
    const currentFingerprints = current.map((entry) => entry.violationFingerprint);
    expect(envelope).toMatchObject({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:derive",
      exitCode: 0,
    });
    expect(baseline).toMatchObject({
      schemaVersion: "phasegate-world-adoption-baseline/v1",
      rulesetVersion: "phasegate-world-wcr/v1",
      adoptedByWorkItemId: "WI-298",
    });
    expect(baseline.sourceEvaluationId).not.toBe(envelope.data.report.evaluationId);
    expect(baseline.sourceCorpusRoot).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(baseline.sourceConstraintRoot).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(baseline.entries.length).toBeGreaterThan(0);
    expect(baseline.entries.every((entry) => entry.ruleId !== "WCR-001")).toBe(true);
    expect(baselineFingerprints).toEqual(sortedUnique(baselineFingerprints));
    expect(currentFingerprints).toEqual(baselineFingerprints);
    expect(current.every((entry) => entry.classification === "adopted-legacy")).toBe(true);
    expect(envelope.data.report.repaidBaselineEntries).toEqual([]);
    expect(envelope.data.report.policyDiagnostics).toEqual([]);
  }, 180_000);

  it("明示semantic debtをcoverage reportから参照しstructural obligationと別collectionへimportすること", () => {
    // Arrange
    const debtId = "pgw:v1:semantic-debt:skill-quality.coverage-attestation-legacy";
    const debts = JSON.parse(
      readFileSync(path.join(repositoryRoot, "phasegate.world-debts.json"), "utf8"),
    ) as DebtDocument;
    const coverageReport = readFileSync(
      path.join(repositoryRoot, "docs/product/construction/skill-quality/coverage_report.md"),
      "utf8",
    );

    // Act
    const actual = run("world:derive", "--json");
    const envelope = JSON.parse(actual.stdout) as DeriveEnvelope;

    // Assert
    expect(actual.exitCode, actual.stderr).toBe(0);
    expect(debts.schemaVersion).toBe("phasegate-world-debts/v1");
    expect(debts.debts).toHaveLength(1);
    expect(debts.debts[0]).toMatchObject({
      debtId,
      kind: "semantic",
      ownerUnit: "skill-quality",
      introducedByWorkItemId: "WI-298",
    });
    expect(coverageReport.match(new RegExp(`@world-semantic-debt ${debtId}`, "g"))).toHaveLength(1);
    expect(coverageReport).toContain("@coverage-gating: ungated-legacy");
    expect(envelope.data.report.declaredSemanticDebts).toEqual([
      expect.objectContaining({
        debtId,
        kind: "semantic",
        ownerUnit: "skill-quality",
        introducedByWorkItemId: "WI-298",
      }),
    ]);
    expect(envelope.data.report.structuralObligations.some((entry) => entry.violationFingerprint === debtId)).toBe(
      false,
    );
  }, 120_000);
});
