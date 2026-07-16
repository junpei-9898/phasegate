// @unit world-model
// @layer test
// @work-item-id WI-290
// @story H17-05

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";
import { SourceMetadataFactExtractor } from "../../../../world-model/infrastructure/adapters/source-metadata-fact-extractor.js";
import { TestReferenceSourceFactExtractor } from "../../../../world-model/infrastructure/adapters/test-reference-source-fact-extractor.js";

class ByteHashingPort implements WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest {
    const value = bytes.reduce((total, byte) => (total + byte) % 256, 0);
    return Sha256Digest.fromHex(value.toString(16).padStart(2, "0").repeat(32));
  }
}

let rootDir: string;

const writeFixture = async (relativePath: string, content: string): Promise<void> => {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-source-facts-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("Source metadata fact extraction", () => {
  it("implementationとtest sourceを排他的なSourceFile factへ分類すること", async () => {
    // Arrange
    await writeFixture(
      "scripts/harness/sample/domain/model.ts",
      "// @unit sample\n// @layer domain\n// @work-item-id WI-290, WI-289\nexport const value = 1;\n",
    );
    await writeFixture(
      "scripts/harness/__tests__/unit/sample/model.test.ts",
      "// @unit sample\n// @layer test\n// @work-item-id WI-290\n",
    );
    const hashingPort = new ByteHashingPort();
    const implementation = new SourceMetadataFactExtractor({ rootDir, hashingPort });
    const tests = new TestReferenceSourceFactExtractor({ rootDir, hashingPort });

    // Act
    const [implementationResult, testResult] = await Promise.all([implementation.extract(), tests.extract()]);

    // Assert
    expect(implementationResult.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:source-file:scripts/harness/sample/domain/model.ts",
    ]);
    expect(testResult.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:source-file:scripts/harness/__tests__/unit/sample/model.test.ts",
    ]);
    expect(implementationResult.nodes[0].attributes).toEqual({
      layer: "domain",
      sourceKind: "implementation",
      unit: "sample",
      workItemIds: ["WI-289", "WI-290"],
    });
    expect(testResult.nodes[0].attributes).toEqual({
      layer: "test",
      sourceKind: "test",
      unit: "sample",
      workItemIds: ["WI-290"],
    });
  });

  it("required metadata欠落をSourceFileごと消さずdiagnosticにすること", async () => {
    // Arrange
    await writeFixture("scripts/harness/sample/domain/missing.ts", "export const value = 1;\n");
    const sut = new SourceMetadataFactExtractor({ rootDir, hashingPort: new ByteHashingPort() });

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes).toHaveLength(1);
    expect(actual.nodes[0].attributes).toEqual({
      layer: null,
      sourceKind: "implementation",
      unit: null,
      workItemIds: [],
    });
    expect(actual.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "missing-source-layer",
      "missing-source-unit",
    ]);
  });
});
