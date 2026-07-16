// @unit world-model
// @layer test
// @work-item-id WI-290
// @story H17-05

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";
import { IntegrityManifestFactExtractor } from "../../../../world-model/infrastructure/adapters/integrity-manifest-fact-extractor.js";

class FixedHashingPort implements WorldHashingPort {
  sha256(): Sha256Digest {
    return Sha256Digest.create(`sha256:${"a".repeat(64)}`);
  }
}

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-integrity-facts-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("Integrity manifest fact extraction", () => {
  it("path順のraw-byte SHA-256 declarationをexternal Artifactへ投影すること", async () => {
    // Arrange
    await writeFile(
      path.join(rootDir, "phasegate.integrity.json"),
      JSON.stringify({
        version: 1,
        algorithm: "sha256",
        files: {
          "z/file": "b".repeat(64),
          "a/file": "c".repeat(64),
        },
      }),
      "utf8",
    );
    const sut = new IntegrityManifestFactExtractor({ rootDir, hashingPort: new FixedHashingPort() });

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:artifact:external-declaration:external:phasegate.integrity.json",
    ]);
    expect(actual.nodes[0].attributes).toEqual({
      algorithm: "sha256",
      declarations: [
        { digest: `sha256:${"c".repeat(64)}`, path: "a/file" },
        { digest: `sha256:${"b".repeat(64)}`, path: "z/file" },
      ],
      version: 1,
    });
  });

  it("file不在とinvalid schemaを区別すること", async () => {
    // Arrange
    const sut = new IntegrityManifestFactExtractor({ rootDir, hashingPort: new FixedHashingPort() });

    // Act
    const absent = await sut.extract();
    await writeFile(
      path.join(rootDir, "phasegate.integrity.json"),
      JSON.stringify({ version: 2, algorithm: "sha512", files: {} }),
      "utf8",
    );
    const invalid = await sut.extract();

    // Assert
    expect(absent.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["not-present"]);
    expect(invalid.nodes).toEqual([]);
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["unsupported-provider-schema"]);
  });
});
