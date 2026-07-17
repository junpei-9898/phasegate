// @unit world-model
// @layer test
// @work-item-id WI-306
// @story H17-18

import { describe, expect, it } from "vitest";
import { WorldSnapshotRootFacade } from "../../../../world-model/application/facades/world-snapshot-root-facade.js";
import { Snapshot } from "../../../../world-model/domain/entities/snapshot.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";

describe("WorldSnapshotRootFacade", () => {
  it("current SnapshotのcorpusRootだけをplain DTOへ射影すること", async () => {
    // Arrange
    const digest = Sha256Digest.fromHex("b".repeat(64));
    const snapshot = Snapshot.create({
      schemaVersion: "phasegate-world-snapshot/v1",
      extractorVersion: "phasegate-world-extractor/v2",
      corpusConfigDigest: digest,
      nodes: [],
      edges: [],
      extractionDiagnostics: [],
      corpusRoot: digest,
      canonicalBytes: new TextEncoder().encode("{}"),
    });
    const sut = new WorldSnapshotRootFacade({ execute: async () => snapshot });

    // Act
    const actual = await sut.read();

    // Assert
    expect(actual).toEqual({
      schemaVersion: "phasegate-world-snapshot-root/v1",
      worldSnapshotRoot: digest.toString(),
    });
    expect(JSON.parse(JSON.stringify(actual))).toEqual(actual);
  });
});
