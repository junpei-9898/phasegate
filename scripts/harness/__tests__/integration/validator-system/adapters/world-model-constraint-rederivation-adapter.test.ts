// @unit validator-system
// @layer integration-test
// @work-item-id WI-302
// @story H17-15
// @ac H17-15-2
// @ac H17-15-3
// @ac H17-15-5
// @ac H17-15-6

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createWorldModelModule } from "../../../../world-model/index.js";
import { WorldModelConstraintRederivationAdapter } from "../../../../validator-system/infrastructure/adapters/world-model-constraint-rederivation-adapter.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const baseFixture = path.resolve(here, "../../../fixtures/world-model/synthetic-mutations/base");
const scenarioManifest = path.resolve(here, "../../../fixtures/world-model/synthetic-mutations/scenarios.json");
const temporaryRoots: string[] = [];

const prepareRoot = async (): Promise<string> => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "world-l3-rederive-"));
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
  await cp(
    path.join(rootDir, "requirement-test-matrix.json"),
    path.join(rootDir, ".harness/requirement-test-matrix.json"),
  );
  await rm(path.join(rootDir, "requirement-test-matrix.json"));
  return rootDir;
};

const writeConstraints = async (rootDir: string, constraints: readonly unknown[], schemaVersion = "phasegate-world-constraints/v1") =>
  writeFile(
    path.join(rootDir, "phasegate.world-constraints.json"),
    `${JSON.stringify({ schemaVersion, constraints, aliases: [] }, null, 2)}\n`,
    "utf8",
  );

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((rootDir) => rm(rootDir, { recursive: true, force: true })));
});

describe("World Model authoritative constraint re-derivation adapter", () => {
  it("base fixtureを保存reportなしでclean PASS observationへ再導出すること", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    await writeConstraints(rootDir, []);
    const adapter = new WorldModelConstraintRederivationAdapter({ rootDir });

    // Act
    const actual = await adapter.collect();

    // Assert
    expect(actual).toEqual({ obligations: [], diagnostics: [] });
  });

  it("new unpinned claimとduplicate IDをmanifestどおりのrule・fingerprintへ再導出すること", async () => {
    // Arrange
    const manifest = JSON.parse(await readFile(scenarioManifest, "utf8")) as {
      scenarios: { id: string; expectedFingerprint: string | null }[];
    };
    const unpinnedRoot = await prepareRoot();
    const duplicateRoot = await prepareRoot();
    const snapshot = await createWorldModelModule({ rootDir: unpinnedRoot }).buildSnapshotUseCase.execute();
    const claimant = snapshot.nodes.find(
      (node) => node.id.toString() === "pgw:v1:source-file:scripts/harness/sample/domain/claimant.ts",
    );
    const premise = snapshot.nodes.find(
      (node) => node.id.toString() === "pgw:v1:source-file:scripts/harness/sample/domain/premise.ts",
    );
    if (!claimant || !premise) throw new Error("source fixture endpoints must exist");
    await writeConstraints(unpinnedRoot, [
      {
        constraintId: "pgw:v1:constraint:world.fixture-unpinned",
        factType: "references",
        claimant: { nodeId: claimant.id.toString() },
        premise: { nodeId: premise.id.toString(), contentDigest: premise.contentDigest.toString() },
        applicableRuleIds: ["WCR-002", "WCR-008"],
      },
    ]);
    await writeConstraints(duplicateRoot, []);
    await writeFile(
      path.join(duplicateRoot, "docs/product/explicit-fragment-duplicate.md"),
      [
        "<!-- @world-fragment-id sample.shared-fragment -->",
        "# Duplicate explicit Fragment",
        "",
        "A second candidate must not win.",
        "",
      ].join("\n"),
      "utf8",
    );

    // Act
    const actual = {
      unpinned: await new WorldModelConstraintRederivationAdapter({ rootDir: unpinnedRoot }).collect(),
      duplicate: await new WorldModelConstraintRederivationAdapter({ rootDir: duplicateRoot }).collect(),
    };

    // Assert
    expect(actual.unpinned.obligations).toContainEqual(
      expect.objectContaining({
        ruleId: "WCR-001",
        classification: "invalid-declaration",
        violationFingerprint: manifest.scenarios.find((item) => item.id === "new-unpinned-claim")?.expectedFingerprint,
      }),
    );
    expect(actual.duplicate.obligations).toContainEqual(
      expect.objectContaining({
        ruleId: "WCR-005",
        classification: "new-structural",
        violationFingerprint: manifest.scenarios.find((item) => item.id === "duplicate-id")?.expectedFingerprint,
      }),
    );
  });

  it("保存reportの作成・改竄・削除でauthoritative observationが変わらないこと", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    await writeConstraints(rootDir, []);
    await writeFile(
      path.join(rootDir, "docs/product/explicit-fragment-duplicate.md"),
      "<!-- @world-fragment-id sample.shared-fragment -->\n# Duplicate\n",
      "utf8",
    );
    const adapter = new WorldModelConstraintRederivationAdapter({ rootDir });
    const reportPath = path.join(rootDir, ".harness/world-obligations.json");

    // Act
    const absent = await adapter.collect();
    await writeFile(reportPath, '{"forged":true}\n', "utf8");
    const forged = await adapter.collect();
    await writeFile(reportPath, '{"schemaVersion":"phasegate-world-obligation-report/v999"}\n', "utf8");
    const tampered = await adapter.collect();
    await rm(reportPath);
    const deleted = await adapter.collect();

    // Assert
    expect(forged).toEqual(absent);
    expect(tampered).toEqual(absent);
    expect(deleted).toEqual(absent);
    expect(absent.obligations).toContainEqual(expect.objectContaining({ ruleId: "WCR-005" }));
  });

  it("unknown constraint schemaをempty fallbackせずauthoritative diagnosticにすること", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    await writeConstraints(rootDir, [], "phasegate-world-constraints/v999");
    const adapter = new WorldModelConstraintRederivationAdapter({ rootDir });

    // Act
    const actual = await adapter.collect();

    // Assert
    expect(actual.obligations).toEqual([]);
    expect(actual.diagnostics).toEqual([
      expect.objectContaining({ code: "unsupported-schema-version", scope: "constraint" }),
    ]);
  });
});
