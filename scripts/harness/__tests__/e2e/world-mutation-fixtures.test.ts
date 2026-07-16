// @unit world-model
// @layer e2e-test
// @work-item-id WI-297
// @story H17-11
// @ac H17-11-1
// @ac H17-11-2
// @ac H17-11-3
// @ac H17-11-4
// @ac H17-11-5

import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { ConstraintEvaluator } from "../../world-model/domain/services/constraint-evaluator.js";
import { ChangeProvenance } from "../../world-model/domain/value-objects/change-provenance.js";
import { createWorldModelModule } from "../../world-model/index.js";
import { FileSystemConstraintDeclarationRepositoryAdapter } from "../../world-model/infrastructure/adapters/file-system-world-control-repository-adapters.js";
import { WorldDeriveCommandHandler } from "../../world-model/presentation/cli/world-derive-command-handler.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../fixtures/world-model/synthetic-mutations");
const baseFixtureRoot = path.join(fixtureRoot, "base");
const temporaryRoots: string[] = [];
const digest = (character: string): string => `sha256:${character.repeat(64)}`;

type ScenarioId =
  | "base"
  | "missing-endpoint"
  | "claimant-content-drift"
  | "premise-content-drift"
  | "deleted-fragment"
  | "renamed-fragment"
  | "valid-fragment-alias"
  | "invalid-fragment-alias"
  | "duplicate-id"
  | "stale-matrix-reference"
  | "malformed-constraint"
  | "unknown-constraint-schema"
  | "new-constraint"
  | "new-unpinned-claim";

interface ScenarioDefinition {
  readonly id: ScenarioId;
  readonly expectedExit: 0 | 1 | 2;
  readonly expectedRuleId: string | null;
  readonly expectedClassification: string | null;
  readonly expectedFingerprint: string | null;
}

interface CliEnvelope {
  readonly schemaVersion: "phasegate-world-cli/v1";
  readonly command: "world:derive";
  readonly exitCode: 0 | 1 | 2;
  readonly data: null | {
    readonly report: {
      readonly evaluationId: string;
      readonly structuralObligations: readonly {
        readonly violationFingerprint: string;
        readonly ruleId: string;
        readonly constraintId: string | null;
        readonly classification: string;
      }[];
      readonly policyDiagnostics: readonly { readonly code: string }[];
      readonly summary: { readonly structuralObligations: number };
    };
    readonly persistence: { readonly state: string };
  };
}

const readScenarios = async (): Promise<readonly ScenarioDefinition[]> => {
  const document = JSON.parse(await readFile(path.join(fixtureRoot, "scenarios.json"), "utf8")) as {
    schemaVersion: string;
    scenarios: ScenarioDefinition[];
  };
  expect(document.schemaVersion).toBe("phasegate-world-synthetic-scenarios/v1");
  return document.scenarios;
};

const prepareRoot = async (): Promise<string> => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "world-mutation-"));
  temporaryRoots.push(rootDir);
  await cp(baseFixtureRoot, rootDir, { recursive: true });
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

const nodeBy = (
  snapshot: Awaited<ReturnType<ReturnType<typeof createWorldModelModule>["buildSnapshotUseCase"]["execute"]>>,
  predicate: (node: (typeof snapshot.nodes)[number]) => boolean,
) => {
  const actual = snapshot.nodes.filter(predicate);
  expect(actual, "fixture node must resolve uniquely").toHaveLength(1);
  return actual[0];
};

const sourceNode = (
  snapshot: Awaited<ReturnType<ReturnType<typeof createWorldModelModule>["buildSnapshotUseCase"]["execute"]>>,
  suffix: string,
) => nodeBy(snapshot, (node) => node.id.toString() === `pgw:v1:source-file:scripts/harness/sample/domain/${suffix}.ts`);

const legacyFragmentNode = (
  snapshot: Awaited<ReturnType<ReturnType<typeof createWorldModelModule>["buildSnapshotUseCase"]["execute"]>>,
  fileName = "legacy-fragment.md",
) =>
  nodeBy(
    snapshot,
    (node) => node.id.toString() === `pgw:v1:fragment:legacy:design-document:product:docs/product/${fileName}`,
  );

const matrixReferenceNode = (
  snapshot: Awaited<ReturnType<ReturnType<typeof createWorldModelModule>["buildSnapshotUseCase"]["execute"]>>,
) => nodeBy(snapshot, (node) => node.projection.type === "test-reference");

const pin = (node: { readonly id: { toString(): string }; readonly contentDigest: { toString(): string } }) => ({
  nodeId: node.id.toString(),
  contentDigest: node.contentDigest.toString(),
});

const constraint = (constraintId: string, claimant: ReturnType<typeof pin>, premise: ReturnType<typeof pin>) => ({
  constraintId,
  factType: "references",
  claimant,
  premise,
  applicableRuleIds: ["WCR-002", "WCR-003", "WCR-004", "WCR-005", "WCR-006", "WCR-008"],
});

const writeConstraints = async (
  rootDir: string,
  constraints: readonly unknown[],
  aliases: readonly { readonly from: string; readonly to: string }[] = [],
  schemaVersion = "phasegate-world-constraints/v1",
): Promise<void> => {
  await writeFile(
    path.join(rootDir, "phasegate.world-constraints.json"),
    `${JSON.stringify({ schemaVersion, constraints, aliases }, null, 2)}\n`,
    "utf8",
  );
};

const mutateSource = async (rootDir: string, endpoint: "claimant" | "premise"): Promise<void> => {
  await writeFile(
    path.join(rootDir, `scripts/harness/sample/domain/${endpoint}.ts`),
    [
      "// @unit sample",
      "// @layer domain",
      "// @work-item-id WI-297",
      "",
      `export const ${endpoint}Value = "drifted";`,
      "",
    ].join("\n"),
    "utf8",
  );
};

const removeMatrixReference = async (rootDir: string): Promise<void> => {
  const matrixPath = path.join(rootDir, ".harness/requirement-test-matrix.json");
  const matrix = JSON.parse(await readFile(matrixPath, "utf8")) as {
    stories: { storyMappings: { testReferences: unknown[] }[] }[];
  };
  matrix.stories[0].storyMappings[0].testReferences = [];
  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
};

const renameLegacyFragment = async (rootDir: string): Promise<void> => {
  await rename(
    path.join(rootDir, "docs/product/legacy-fragment.md"),
    path.join(rootDir, "docs/product/renamed-fragment.md"),
  );
};

const addDuplicateExplicitFragment = async (rootDir: string): Promise<void> => {
  await writeFile(
    path.join(rootDir, "docs/product/explicit-fragment-duplicate.md"),
    [
      "<!-- @world-fragment-id sample.shared-fragment -->",
      "# Duplicate explicit Fragment",
      "",
      "A second candidate must not win.",
      "",
    ].join("\n"),
    "utf8",
  );
};

const buildBaseline = async (rootDir: string) => createWorldModelModule({ rootDir }).buildSnapshotUseCase.execute();

const configureScenario = async (
  scenario: ScenarioId,
  currentRoot: string,
  baseline: Awaited<ReturnType<typeof buildBaseline>>,
): Promise<void> => {
  const claimant = sourceNode(baseline, "claimant");
  const premise = sourceNode(baseline, "premise");
  const sourceConstraint = constraint("pgw:v1:constraint:world.fixture-source", pin(claimant), pin(premise));
  if (scenario === "base") return writeConstraints(currentRoot, [sourceConstraint]);
  if (scenario === "missing-endpoint") {
    return writeConstraints(currentRoot, [
      constraint(
        "pgw:v1:constraint:world.fixture-missing",
        { nodeId: "pgw:v1:source-file:scripts/harness/sample/domain/missing.ts", contentDigest: digest("a") },
        pin(premise),
      ),
    ]);
  }
  if (scenario === "claimant-content-drift" || scenario === "premise-content-drift") {
    await mutateSource(currentRoot, scenario === "claimant-content-drift" ? "claimant" : "premise");
    return writeConstraints(currentRoot, [sourceConstraint]);
  }
  if (
    scenario === "deleted-fragment" ||
    scenario === "renamed-fragment" ||
    scenario === "valid-fragment-alias" ||
    scenario === "invalid-fragment-alias"
  ) {
    const legacy = legacyFragmentNode(baseline);
    const fragmentConstraint = constraint("pgw:v1:constraint:world.fixture-fragment", pin(legacy), pin(premise));
    if (scenario === "deleted-fragment") {
      await rm(path.join(currentRoot, "docs/product/legacy-fragment.md"));
      return writeConstraints(currentRoot, [fragmentConstraint]);
    }
    await renameLegacyFragment(currentRoot);
    if (scenario === "renamed-fragment") return writeConstraints(currentRoot, [fragmentConstraint]);
    const renamedId = legacyFragmentNode(
      await createWorldModelModule({ rootDir: currentRoot }).buildSnapshotUseCase.execute(),
      "renamed-fragment.md",
    ).id.toString();
    if (scenario === "valid-fragment-alias") {
      return writeConstraints(currentRoot, [fragmentConstraint], [{ from: legacy.id.toString(), to: renamedId }]);
    }
    return writeConstraints(
      currentRoot,
      [fragmentConstraint],
      [{ from: legacy.id.toString(), to: "pgw:v1:fragment:legacy:design-document:product:docs/product/missing.md" }],
    );
  }
  if (scenario === "duplicate-id") {
    await addDuplicateExplicitFragment(currentRoot);
    return writeConstraints(currentRoot, []);
  }
  if (scenario === "stale-matrix-reference") {
    const reference = matrixReferenceNode(baseline);
    await removeMatrixReference(currentRoot);
    return writeConstraints(currentRoot, [
      constraint("pgw:v1:constraint:world.fixture-matrix", pin(reference), pin(premise)),
    ]);
  }
  if (scenario === "malformed-constraint") {
    return writeConstraints(currentRoot, [{ constraintId: "broken", factType: "references" }]);
  }
  if (scenario === "unknown-constraint-schema") {
    return writeConstraints(currentRoot, [], [], "phasegate-world-constraints/v999");
  }
  if (scenario === "new-constraint") {
    return writeConstraints(currentRoot, [
      constraint("pgw:v1:constraint:world.fixture-new", pin(claimant), {
        nodeId: "pgw:v1:source-file:scripts/harness/sample/domain/not-yet-created.ts",
        contentDigest: digest("b"),
      }),
    ]);
  }
  await writeConstraints(currentRoot, [
    {
      constraintId: "pgw:v1:constraint:world.fixture-unpinned",
      factType: "references",
      claimant: { nodeId: claimant.id.toString() },
      premise: pin(premise),
      applicableRuleIds: ["WCR-002", "WCR-008"],
    },
  ]);
};

const executeScenario = async (
  scenario: ScenarioId,
  policyAsOfDate = "2026-07-17",
): Promise<{
  readonly rootDir: string;
  readonly baseline: Awaited<ReturnType<typeof buildBaseline>>;
  readonly currentSnapshot: Awaited<ReturnType<typeof buildBaseline>>;
  readonly result: { readonly exitCode: number; readonly stdout: string; readonly stderr: string };
  readonly envelope: CliEnvelope;
}> => {
  const baselineRoot = await prepareRoot();
  const currentRoot = await prepareRoot();
  const baseline = await buildBaseline(baselineRoot);
  await configureScenario(scenario, currentRoot, baseline);
  const currentModule = createWorldModelModule({
    rootDir: currentRoot,
    policyDate: { currentUtcDate: () => policyAsOfDate },
  });
  const currentSnapshot = await currentModule.buildSnapshotUseCase.execute();
  const handler = new WorldDeriveCommandHandler({
    execute: (input) =>
      currentModule.deriveWorldObligationsUseCase.execute({
        ...input,
        baselineSnapshot: baseline,
      }),
  });
  const result = await handler.execute(["--json"]);
  return {
    rootDir: currentRoot,
    baseline,
    currentSnapshot,
    result,
    envelope: JSON.parse(result.stdout) as CliEnvelope,
  };
};

const fingerprints = (envelope: CliEnvelope): readonly string[] =>
  envelope.data?.report.structuralObligations.map((item) => item.violationFingerprint) ?? [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((rootDir) => rm(rootDir, { recursive: true, force: true })));
});

describe("World synthetic mutation E2E", () => {
  it("baseと全structural mutationを期待rule・fingerprint・classification・exitへ決定的に分類すること", async () => {
    // Arrange
    const scenarios = await readScenarios();

    // Act
    const actual = await Promise.all(
      scenarios.map(async (scenario) => ({ scenario, run: await executeScenario(scenario.id) })),
    );

    // Assert
    const actualFingerprints: Record<string, string> = {};
    for (const { scenario, run } of actual) {
      expect(run.result.stderr, scenario.id).toBe("");
      expect(run.result.exitCode, scenario.id).toBe(scenario.expectedExit);
      expect(run.envelope.exitCode, scenario.id).toBe(scenario.expectedExit);
      if (scenario.expectedRuleId === null) {
        if (scenario.expectedExit === 0) {
          expect(run.envelope.data?.report.summary.structuralObligations, scenario.id).toBe(0);
        } else {
          expect(run.envelope.data, scenario.id).toBeNull();
        }
        continue;
      }
      const obligation = run.envelope.data?.report.structuralObligations.find(
        (candidate) => candidate.ruleId === scenario.expectedRuleId,
      );
      expect(obligation, scenario.id).toBeDefined();
      expect(obligation?.classification, scenario.id).toBe(scenario.expectedClassification);
      expect(obligation?.violationFingerprint, scenario.id).toMatch(
        /^pgw:v1:violation-fingerprint:sha256:[0-9a-f]{64}$/,
      );
      actualFingerprints[scenario.id] = obligation?.violationFingerprint ?? "";
    }
    const expectedFingerprints = Object.fromEntries(
      scenarios
        .filter((scenario) => scenario.expectedFingerprint !== null)
        .map((scenario) => [scenario.id, scenario.expectedFingerprint]),
    );
    expect(actualFingerprints).toEqual(expectedFingerprints);
  }, 120_000);

  it("legacy Fragment renameはaliasなしでWCR-003、valid aliasでresolved-via-aliasになること", async () => {
    // Arrange / Act
    const deleted = await executeScenario("renamed-fragment");
    const aliased = await executeScenario("valid-fragment-alias");
    const repository = new FileSystemConstraintDeclarationRepositoryAdapter({ rootDir: aliased.rootDir });
    const declarations = await repository.load();
    expect(declarations.state).not.toBe("invalid");
    if (declarations.state === "invalid") throw new Error("fixture constraints must be admitted");
    const evaluation = new ConstraintEvaluator().evaluateFull({
      currentSnapshot: aliased.currentSnapshot,
      baselineSnapshot: aliased.baseline,
      records: declarations.value.records,
      malformedDeclarations: declarations.value.malformedDeclarations,
      aliases: declarations.value.aliases,
      relations: declarations.value.relations,
      changeProvenance: ChangeProvenance.between(aliased.baseline, aliased.currentSnapshot),
    });

    // Assert
    expect(deleted.envelope.data?.report.structuralObligations.map((item) => item.ruleId)).toContain("WCR-003");
    expect(aliased.result.exitCode).toBe(0);
    expect(evaluation.evaluations[0].claimant.status).toBe("resolved-via-alias");
    expect(evaluation.findings).toEqual([]);
  });

  it("waiverはexpiresOn前日だけactiveで当日は同じfingerprintを再びblockingにすること", async () => {
    // Arrange
    const candidate = await executeScenario("claimant-content-drift", "2026-07-17");
    const violationFingerprint = fingerprints(candidate.envelope)[0];
    await writeFile(
      path.join(candidate.rootDir, "phasegate.world-waivers.json"),
      `${JSON.stringify(
        {
          schemaVersion: "phasegate-world-waivers/v1",
          waivers: [
            {
              waiverId: "pgw:v1:waiver:world.fixture-expiry",
              violationFingerprint,
              reason: "Synthetic exclusive-expiry boundary",
              expiresOn: "2026-07-18",
              workItemId: "WI-297",
              renewalOf: null,
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    const executeAt = async (date: string) => {
      const module = createWorldModelModule({
        rootDir: candidate.rootDir,
        policyDate: { currentUtcDate: () => date },
      });
      const handler = new WorldDeriveCommandHandler({
        execute: (input) =>
          module.deriveWorldObligationsUseCase.execute({ ...input, baselineSnapshot: candidate.baseline }),
      });
      const result = await handler.execute(["--json"]);
      return { result, envelope: JSON.parse(result.stdout) as CliEnvelope };
    };

    // Act
    const active = await executeAt("2026-07-17");
    const expired = await executeAt("2026-07-18");

    // Assert
    expect(active.result.exitCode).toBe(0);
    expect(active.envelope.data?.report.structuralObligations[0]).toMatchObject({
      violationFingerprint,
      classification: "waived",
    });
    expect(expired.result.exitCode).toBe(1);
    expect(expired.envelope.data?.report.structuralObligations[0]).toMatchObject({
      violationFingerprint,
      classification: "new-structural",
    });
    expect(expired.envelope.data?.report.policyDiagnostics.map((item) => item.code)).toEqual(["expired-waiver"]);
  });

  it("同一mutationのJSONを二回byte-identicalに導出すること", async () => {
    // Arrange
    const fixture = await executeScenario("claimant-content-drift");
    const module = createWorldModelModule({
      rootDir: fixture.rootDir,
      policyDate: { currentUtcDate: () => "2026-07-17" },
    });
    const handler = new WorldDeriveCommandHandler({
      execute: (input) =>
        module.deriveWorldObligationsUseCase.execute({ ...input, baselineSnapshot: fixture.baseline }),
    });

    // Act
    const actual = [await handler.execute(["--json"]), await handler.execute(["--json"])];

    // Assert
    expect(actual[0].exitCode).toBe(1);
    expect(actual[0].stdout).toBe(actual[1].stdout);
    expect(actual[0].stdout).not.toContain("generatedAt");
  });

  it("stale reportの存在・手編集・削除でpure再導出とexit codeが変わらないこと", async () => {
    // Arrange
    const fixture = await executeScenario("claimant-content-drift");
    const reportPath = path.join(fixture.rootDir, ".harness/world-obligations.json");
    const module = createWorldModelModule({
      rootDir: fixture.rootDir,
      policyDate: { currentUtcDate: () => "2026-07-17" },
    });
    const handler = new WorldDeriveCommandHandler({
      execute: (input) =>
        module.deriveWorldObligationsUseCase.execute({ ...input, baselineSnapshot: fixture.baseline }),
    });

    // Act / Assert: clean
    const clean = await handler.execute(["--json"]);
    expect(clean.exitCode).toBe(1);

    // Act / Assert: stale .harness report
    await writeFile(reportPath, '{"forged":true}\n', "utf8");
    const stale = await handler.execute(["--json"]);
    expect(stale).toEqual(clean);

    // Act / Assert: generated report is then edited
    const written = await handler.execute(["--write", "--json"]);
    expect(written.exitCode).toBe(1);
    await writeFile(reportPath, '{"schemaVersion":"forged"}\n', "utf8");
    const edited = await handler.execute(["--json"]);
    expect(edited).toEqual(clean);

    // Act / Assert: report deletion
    await rm(reportPath);
    const deleted = await handler.execute(["--json"]);
    expect(deleted).toEqual(clean);
  });
});
