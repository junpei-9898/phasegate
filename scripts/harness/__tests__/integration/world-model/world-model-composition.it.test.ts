// @unit world-model
// @layer integration
// @work-item-id WI-291
// @story H17-06

import { appendFile, cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWorldModelModule } from "../../../world-model/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const designFixture = path.resolve(here, "../../fixtures/world-model/design-corpus/minimal-valid");
const runtimeFixture = path.resolve(here, "../../fixtures/world-model/runtime-corpus/minimal-valid");
let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-composition-"));
  await cp(designFixture, rootDir, { recursive: true });
  await cp(runtimeFixture, rootDir, { recursive: true, force: true });
  await appendFile(
    path.join(rootDir, "docs/product/user_stories.md"),
    "\n### H17-05: Runtime evidence extractor\n\n- [ ] AC-1: runtime evidence is extracted\n",
    "utf-8",
  );
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("World model composition", () => {
  it("全extractorをpublic provider capability経由で一つのSnapshotへ組み立てること", async () => {
    // Arrange
    const sut = createWorldModelModule({ rootDir });

    // Act
    const actual = await sut.inspectWorldUseCase.execute();

    // Assert
    expect(actual.summary.nodeCount).toBeGreaterThan(10);
    expect(actual.summary.edgeCount).toBeGreaterThan(0);
    expect(actual.summary.hardDiagnosticCount, JSON.stringify(actual.diagnostics)).toBe(0);
    expect(actual.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        "pgw:v1:artifact:design-document:product:docs/product/product_overview.md",
        "pgw:v1:source-file:scripts/harness/sample/domain/model.ts",
        "pgw:v1:artifact:generated-artifact:generated:.harness/requirement-test-matrix.json",
        "pgw:v1:artifact:external-declaration:external:phasegate.integrity.json",
      ]),
    );
  });

  it("同じrepositoryを2回inspectionしてbyte-identicalなplain DTOを返すこと", async () => {
    // Arrange
    const sut = createWorldModelModule({ rootDir });

    // Act
    const actual = [await sut.inspectWorldUseCase.execute(), await sut.inspectWorldUseCase.execute()];

    // Assert
    expect(JSON.stringify(actual[0])).toBe(JSON.stringify(actual[1]));
    expect(actual[0].corpusRoot).toBe(actual[1].corpusRoot);
  });

  it("解決済み既存configのdesign・inception・matrix pathだけをowner extractorへ反映すること", async () => {
    // Arrange
    await cp(path.join(rootDir, "docs/product"), path.join(rootDir, "spec/product"), { recursive: true });
    await cp(path.join(rootDir, "docs/inception"), path.join(rootDir, "spec/inception"), { recursive: true });
    await mkdir(path.join(rootDir, "generated"), { recursive: true });
    await cp(path.join(rootDir, ".harness/requirement-test-matrix.json"), path.join(rootDir, "generated/matrix.json"));
    const sut = createWorldModelModule({
      rootDir,
      resolvedConfig: {
        designDocsRoot: "spec/product/construction",
        inceptionRoot: "spec/inception",
        requirementMatrixPath: "generated/matrix.json",
      },
    });

    // Act
    const actual = await sut.inspectWorldUseCase.execute();

    // Assert
    expect(actual.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        "pgw:v1:artifact:design-document:product:docs/product/product_overview.md",
        "pgw:v1:artifact:design-document:product:spec/product/product_overview.md",
        "pgw:v1:artifact:design-document:inception:spec/inception/_cross/WI-289/description.md",
        "pgw:v1:artifact:generated-artifact:generated:generated/matrix.json",
        "pgw:v1:work-item:WI-289",
      ]),
    );
  });
});
