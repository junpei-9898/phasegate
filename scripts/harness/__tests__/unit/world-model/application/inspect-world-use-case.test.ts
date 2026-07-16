// @unit world-model
// @layer test
// @work-item-id WI-291
// @story H17-06

import { describe, expect, it } from "vitest";
import { InspectWorldUseCase } from "../../../../world-model/application/usecases/inspect-world-use-case.js";
import { ExtractionDiagnostic } from "../../../../world-model/domain/entities/extraction-diagnostic.js";
import { Snapshot } from "../../../../world-model/domain/entities/snapshot.js";
import { WorldNode } from "../../../../world-model/domain/entities/world-node.js";
import { ArtifactKind } from "../../../../world-model/domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../../../world-model/domain/value-objects/corpus-role.js";
import { PathKey } from "../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";

const digest = Sha256Digest.fromHex("2".repeat(64));
const artifact = WorldNode.artifact({
  artifactKind: ArtifactKind.generatedArtifact(),
  corpusRole: CorpusRole.generated(),
  path: PathKey.create(".harness/requirement-test-matrix.json"),
  digest,
});

const createSnapshot = (diagnostics: readonly ExtractionDiagnostic[]) =>
  Snapshot.create({
    schemaVersion: "phasegate-world-snapshot/v1",
    extractorVersion: "phasegate-world-extractor/v1",
    corpusConfigDigest: digest,
    nodes: [artifact],
    edges: [],
    extractionDiagnostics: diagnostics,
    corpusRoot: digest,
    canonicalBytes: new TextEncoder().encode("{}"),
  });

describe("InspectWorldUseCase", () => {
  it("Snapshotをdomain型を漏らさないstable inventory DTOへ変換すること", async () => {
    // Arrange
    const snapshot = createSnapshot([]);
    const sut = new InspectWorldUseCase({ buildSnapshot: { execute: async () => snapshot } });

    // Act
    const actual = await sut.execute();

    // Assert
    expect(actual.summary).toEqual({
      diagnosticCount: 0,
      edgeCount: 0,
      hardDiagnosticCount: 0,
      nodeCount: 1,
    });
    expect(actual.inventory).toEqual({
      artifactKinds: [{ count: 1, value: "generated-artifact" }],
      corpusRoles: [{ count: 1, value: "generated" }],
      nodeTypes: [{ count: 1, value: "artifact" }],
    });
    expect(actual.nodes[0]).toEqual(artifact.toCanonicalValue());
    expect(JSON.parse(JSON.stringify(actual))).toEqual(actual);
    expect(actual).not.toHaveProperty("generatedAt");
  });

  it("optional not-presentをhard diagnosticへ数えず他のdiagnosticを数えること", async () => {
    // Arrange
    const snapshot = createSnapshot([
      ExtractionDiagnostic.create({
        code: "not-present",
        path: PathKey.create(".harness/attestation.json"),
        payload: { provider: "attestation" },
      }),
      ExtractionDiagnostic.create({
        code: "duplicate-node-id",
        path: PathKey.create("docs/product/a.md"),
        payload: { candidates: 2 },
      }),
    ]);
    const sut = new InspectWorldUseCase({ buildSnapshot: { execute: async () => snapshot } });

    // Act
    const actual = await sut.execute();

    // Assert
    expect(actual.summary.diagnosticCount).toBe(2);
    expect(actual.summary.hardDiagnosticCount).toBe(1);
    expect(actual.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["duplicate-node-id", "not-present"]);
  });
});
