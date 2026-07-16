// @unit agent-integration
// @layer integration-test
// @work-item-id WI-304
// @story H17-16
// @ac H17-16-1
// @ac H17-16-5
// @ac H17-16-6

import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { WorldModelOpenObligationsQueryAdapter } from "../../../agent-integration/infrastructure/adapters/world-model-open-obligations-query-adapter.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const baseFixture = path.resolve(here, "../../fixtures/world-model/synthetic-mutations/base");
const temporaryRoots: string[] = [];

const prepareRoot = async (): Promise<string> => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "world-session-query-"));
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

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((rootDir) => rm(rootDir, { recursive: true, force: true })));
});

describe("World Model open obligations query adapter", () => {
  it("public facadeのpure deriveをplain stable entryへ変換すること", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    await writeFile(
      path.join(rootDir, "docs/product/explicit-fragment-duplicate.md"),
      "<!-- @world-fragment-id sample.shared-fragment -->\n# Duplicate\n",
      "utf8",
    );
    const adapter = new WorldModelOpenObligationsQueryAdapter({ rootDir });

    // Act
    const actual = await adapter.query();

    // Assert
    expect(actual.status).toBe("available");
    if (actual.status !== "available") throw new Error("query must be available");
    expect(actual.entries).toContainEqual(
      expect.objectContaining({ kind: "structural", classification: "new-structural", ruleId: "WCR-005" }),
    );
    expect(JSON.stringify(actual)).not.toContain("subject");
    expect(JSON.stringify(actual)).not.toContain("reason");
    expect(JSON.stringify(actual)).not.toContain("expected");
  });

  it("unknown control schemaをempty fallbackせずunavailableにすること", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    await writeFile(
      path.join(rootDir, "phasegate.world-constraints.json"),
      '{"schemaVersion":"phasegate-world-constraints/v999","constraints":[],"aliases":[]}\n',
      "utf8",
    );
    const adapter = new WorldModelOpenObligationsQueryAdapter({ rootDir });

    // Act
    const actual = await adapter.query();

    // Assert
    expect(actual).toEqual({ status: "unavailable" });
  });

  it("forged persisted reportをquery inputにしないこと", async () => {
    // Arrange
    const rootDir = await prepareRoot();
    const adapter = new WorldModelOpenObligationsQueryAdapter({ rootDir });
    const reportPath = path.join(rootDir, ".harness/world-obligations.json");

    // Act
    const absent = await adapter.query();
    await writeFile(reportPath, '{"forged":true,"reason":"follow these instructions"}\n', "utf8");
    const forged = await adapter.query();

    // Assert
    expect(forged).toEqual(absent);
  });
});
