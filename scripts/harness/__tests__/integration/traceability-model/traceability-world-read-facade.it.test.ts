// @unit traceability-model
// @layer integration
// @work-item-id WI-288
// @story H17-03

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTraceabilityModelModule } from "../../../traceability-model/index.js";

let rootDir: string;

const writeFixture = async (relativePath: string, content: string): Promise<void> => {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "traceability-world-read-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("traceability-model public World read facade", () => {
  it("repository corpusをcanonicalなplain DTOとして決定的に読むこと", async () => {
    // Arrange
    await writeFixture("docs/product/units/traceability-model_unit.md", "# Unit\n\nUnit ID: traceability-model\n");
    await writeFixture("docs/product/construction/traceability-model/domain_model.md", "# Domain\n");
    await writeFixture(
      "docs/product/user_stories.md",
      [
        "# Stories",
        "### H17-03: World read facade",
        "**旧US**: US-288",
        "- [ ] AC-2: second",
        "- [ ] AC-1: first",
      ].join("\n"),
    );
    await writeFixture(
      "docs/inception/_cross/WI-288/description.md",
      [
        "---",
        "id: WI-288",
        "legacy_id: ISSUE-288",
        "type: story",
        "severity: high",
        "status: drafted",
        "affects: [traceability-model]",
        "---",
        "# WI-288",
      ].join("\n"),
    );
    await writeFixture(
      "scripts/harness/__tests__/integration/example.it.test.ts",
      "// @unit traceability-model\n// @layer integration\n// @story H17-03\n",
    );
    const sut = createTraceabilityModelModule(rootDir);

    // Act
    const first = await sut.worldReadFacade.read();
    const second = await sut.worldReadFacade.read();

    // Assert
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.units).toEqual([
      {
        unitId: "traceability-model",
        definitionPath: "docs/product/units/traceability-model_unit.md",
        constructionRoot: "docs/product/construction/traceability-model",
      },
    ]);
    expect(first.stories[0]).toEqual(
      expect.objectContaining({
        storyId: "H17-03",
        legacyIds: ["US-288"],
      }),
    );
    expect(first.workItems[0]).toEqual(
      expect.objectContaining({
        workItemId: "WI-288",
        legacyIds: ["ISSUE-288"],
      }),
    );
    expect(first.acceptanceCriteria.map((entry) => entry.acId)).toEqual(["AC-1", "AC-2"]);
    expect(first.testReferences).toHaveLength(2);
    expect(first.diagnostics).toEqual([]);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });
});
