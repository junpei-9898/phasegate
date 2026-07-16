// @unit world-model
// @layer integration
// @work-item-id WI-294
// @story H17-08
// @ac H17-08-1
// @ac H17-08-2
// @ac H17-08-3
// @ac H17-08-4
// @ac H17-08-5

import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FileSystemAdoptionBaselineRepositoryAdapter,
  FileSystemConstraintDeclarationRepositoryAdapter,
  FileSystemSemanticDebtRepositoryAdapter,
  FileSystemWaiverDeclarationRepositoryAdapter,
} from "../../../world-model/infrastructure/adapters/file-system-world-control-repository-adapters.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../fixtures/world-model/control-declarations/minimal-valid");
let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-control-declarations-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

const repositories = () => ({
  constraints: new FileSystemConstraintDeclarationRepositoryAdapter({ rootDir }),
  baseline: new FileSystemAdoptionBaselineRepositoryAdapter({ rootDir }),
  waivers: new FileSystemWaiverDeclarationRepositoryAdapter({ rootDir }),
  debts: new FileSystemSemanticDebtRepositoryAdapter({ rootDir }),
});

describe("World control declaration filesystem repositories", () => {
  it("canonical root fileが不在なら4種類のcanonical empty inputを返すこと", async () => {
    // Arrange
    const actualRepositories = repositories();

    // Act
    const actual = await Promise.all([
      actualRepositories.constraints.load(),
      actualRepositories.baseline.load(),
      actualRepositories.waivers.load(),
      actualRepositories.debts.load(),
    ]);

    // Assert
    expect(actual.map((result) => result.state)).toEqual(["absent", "absent", "absent", "absent"]);
    expect(actual[0]).toMatchObject({ value: { records: [], aliases: [], malformedDeclarations: [] } });
    expect(actual[1]).toMatchObject({ value: null });
    expect(actual[2]).toMatchObject({ value: [] });
    expect(actual[3]).toMatchObject({ value: [] });
  });

  it("published schemaに適合する4 control fileをdomain declarationへ読み込むこと", async () => {
    // Arrange
    await cp(fixtureRoot, rootDir, { recursive: true });
    const actualRepositories = repositories();

    // Act
    const actual = await Promise.all([
      actualRepositories.constraints.load(),
      actualRepositories.baseline.load(),
      actualRepositories.waivers.load(),
      actualRepositories.debts.load(),
    ]);

    // Assert
    expect(actual.map((result) => result.state)).toEqual(["loaded", "loaded", "loaded", "loaded"]);
    expect(actual[0]).toMatchObject({ value: { records: [{ factType: "references" }] } });
    expect(actual[1]).toMatchObject({ value: { adoptedByWorkItemId: "WI-294" } });
    expect(actual[2]).toMatchObject({ value: [{ waiverId: "pgw:v1:waiver:world.temporary-gap" }] });
    expect(actual[3]).toMatchObject({ value: [{ debtId: "pgw:v1:semantic-debt:world.known-gap" }] });
  });

  it("存在するunknown schemaとinvalid JSONをemptyへfallbackせずinvalidにすること", async () => {
    // Arrange
    await writeFile(
      path.join(rootDir, "phasegate.world-constraints.json"),
      JSON.stringify({ schemaVersion: "phasegate-world-constraints/v99", constraints: [], aliases: [] }),
      "utf8",
    );
    await writeFile(path.join(rootDir, "phasegate.world-waivers.json"), "{ invalid", "utf8");
    const actualRepositories = repositories();

    // Act
    const actual = await Promise.all([actualRepositories.constraints.load(), actualRepositories.waivers.load()]);

    // Assert
    expect(actual[0]).toMatchObject({ state: "invalid", diagnostics: [{ code: "unsupported-schema-version" }] });
    expect(actual[1]).toMatchObject({ state: "invalid", diagnostics: [{ code: "invalid-json" }] });
    expect("value" in actual[0]).toBe(false);
    expect("value" in actual[1]).toBe(false);
  });

  it("supported constraintsのmalformedとduplicateをWCR-001候補としてno-winnerにすること", async () => {
    // Arrange
    const validText = await readFile(path.join(fixtureRoot, "phasegate.world-constraints.json"), "utf8");
    const document = JSON.parse(validText) as { constraints: Record<string, unknown>[]; aliases: unknown[] };
    document.constraints.push(document.constraints[0]);
    document.constraints.push({ ...document.constraints[0], constraintId: "invalid" });
    await writeFile(path.join(rootDir, "phasegate.world-constraints.json"), JSON.stringify(document), "utf8");

    // Act
    const actual = await repositories().constraints.load();

    // Assert
    expect(actual.state).toBe("loaded");
    if (actual.state !== "loaded") throw new Error("expected loaded constraints");
    expect(actual.value.records).toEqual([]);
    expect(actual.value.malformedDeclarations).toHaveLength(3);
    expect(actual.value.diagnostics.map((diagnostic) => diagnostic.code)).toContain("duplicate-constraint-id");
  });

  it("review済みcontrol documentをtemporary fileからatomic replaceすること", async () => {
    // Arrange
    const document = JSON.parse(
      await readFile(path.join(fixtureRoot, "phasegate.world-constraints.json"), "utf8"),
    ) as Record<string, unknown>;
    const repository = repositories().constraints;

    // Act
    const actual = await repository.replaceAtomically(document);

    // Assert
    expect(actual).toEqual({ state: "written", path: "phasegate.world-constraints.json" });
    expect(JSON.parse(await readFile(path.join(rootDir, "phasegate.world-constraints.json"), "utf8"))).toEqual(
      document,
    );
    expect((await readdir(rootDir)).filter((name) => name.includes(".tmp"))).toEqual([]);
  });

  it("ci-governance path baselineをWorld adoption baselineへ暗黙importしないこと", async () => {
    // Arrange
    const legacyBaseline = { entries: [{ path: "docs/product/a.md", hash: "abc123" }] };
    await writeFile(path.join(rootDir, "phasegate.world-baseline.json"), JSON.stringify(legacyBaseline), "utf8");

    // Act
    const actual = await repositories().baseline.load();

    // Assert
    expect(actual).toMatchObject({ state: "invalid" });
    expect("value" in actual).toBe(false);
  });
});
