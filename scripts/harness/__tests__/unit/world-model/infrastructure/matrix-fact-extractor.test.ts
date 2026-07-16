// @unit world-model
// @layer test
// @work-item-id WI-290
// @story H17-05

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RequirementTestMatrixDto } from "../../../../nyquist-validation/index.js";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";
import { MatrixFactExtractor } from "../../../../world-model/infrastructure/adapters/matrix-fact-extractor.js";

class ByteHashingPort implements WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest {
    let value = 0;
    for (const byte of bytes) value = (value * 31 + byte) >>> 0;
    return Sha256Digest.fromHex(value.toString(16).padStart(8, "0").repeat(8));
  }
}

let rootDir: string;
const matrixPath = ".harness/requirement-test-matrix.json";

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-matrix-facts-"));
  await mkdir(path.join(rootDir, ".harness"), { recursive: true });
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

const writeMatrix = async (matrix: unknown): Promise<void> => {
  await writeFile(path.join(rootDir, matrixPath), JSON.stringify(matrix), "utf8");
};

const matrix = (generatedAt: string): RequirementTestMatrixDto => ({
  version: "1.1",
  generatedAt,
  stories: [
    {
      storyId: "H17-05",
      storyMappings: [
        {
          acId: "AC-2",
          testReferences: [
            {
              filePath: "scripts/harness/__tests__/unit/sample.test.ts",
              testType: "unit",
              testName: "sample",
              binding: "ac",
            },
          ],
        },
        {
          acId: "AC-1",
          testReferences: [
            {
              filePath: "scripts/harness/__tests__/unit/sample.test.ts",
              testType: "unit",
            },
          ],
        },
      ],
    },
  ],
});

describe("Matrix fact extraction", () => {
  it("owner tupleからsorted TestReference nodeを生成してbinding欠落をfileへ正規化すること", async () => {
    // Arrange
    await writeMatrix(matrix("2026-07-16T00:00:00.000Z"));
    const sut = new MatrixFactExtractor({ rootDir, hashingPort: new ByteHashingPort() });

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:artifact:generated-artifact:generated:.harness/requirement-test-matrix.json",
      "pgw:v1:test-reference:H17-05:AC-1:file:unit:scripts/harness/__tests__/unit/sample.test.ts:name:none",
      "pgw:v1:test-reference:H17-05:AC-2:ac:unit:scripts/harness/__tests__/unit/sample.test.ts:name:value:sample",
    ]);
    expect(actual.nodes[0].attributes).not.toHaveProperty("generatedAt");
    expect(actual.diagnostics).toEqual([]);
  });

  it("generatedAtとowner setの列挙順だけが違う場合は同じArtifact digestを返すこと", async () => {
    // Arrange
    const firstMatrix = matrix("2026-07-16T00:00:00.000Z");
    const secondMatrix = {
      ...matrix("2030-01-01T00:00:00.000Z"),
      stories: [...firstMatrix.stories]
        .reverse()
        .map((story) => ({ ...story, storyMappings: [...story.storyMappings].reverse() })),
    };
    const sut = new MatrixFactExtractor({ rootDir, hashingPort: new ByteHashingPort() });

    // Act
    await writeMatrix(firstMatrix);
    const first = await sut.extract();
    await writeMatrix(secondMatrix);
    const second = await sut.extract();

    // Assert
    expect(first.nodes[0].contentDigest.toString()).toBe(second.nodes[0].contentDigest.toString());
    expect(first.nodes.map((node) => node.id.toString())).toEqual(second.nodes.map((node) => node.id.toString()));
  });

  it("duplicate TestReference tupleにwinnerを選ばないこと", async () => {
    // Arrange
    const duplicate = matrix("2026-07-16T00:00:00.000Z");
    const reference = duplicate.stories[0].storyMappings[0].testReferences[0];
    await writeMatrix({
      ...duplicate,
      stories: [
        {
          ...duplicate.stories[0],
          storyMappings: [
            {
              ...duplicate.stories[0].storyMappings[0],
              testReferences: [reference, { ...reference }],
            },
          ],
        },
      ],
    });
    const sut = new MatrixFactExtractor({ rootDir, hashingPort: new ByteHashingPort() });

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes.map((node) => node.id.nodeType)).toEqual(["artifact"]);
    expect(actual.diagnostics.map((diagnostic) => diagnostic.code)).toContain("duplicate-node-id");
  });

  it("file不在とunsupported schemaを区別すること", async () => {
    // Arrange
    const sut = new MatrixFactExtractor({ rootDir, hashingPort: new ByteHashingPort() });

    // Act
    const absent = await sut.extract();
    await writeMatrix({ version: "9.0", generatedAt: "x", stories: [] });
    const unsupported = await sut.extract();

    // Assert
    expect(absent.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["not-present"]);
    expect(unsupported.nodes).toEqual([]);
    expect(unsupported.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["unsupported-provider-schema"]);
  });
});
