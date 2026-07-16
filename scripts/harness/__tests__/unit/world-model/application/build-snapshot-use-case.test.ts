// @unit world-model
// @layer test
// @work-item-id WI-291
// @story H17-06

import { describe, expect, it } from "vitest";
import { BuildSnapshotUseCase } from "../../../../world-model/application/usecases/build-snapshot-use-case.js";
import { Edge } from "../../../../world-model/domain/entities/edge.js";
import { WorldNode } from "../../../../world-model/domain/entities/world-node.js";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { CanonicalJsonSerializer } from "../../../../world-model/domain/services/canonical-json-serializer.js";
import { SnapshotRootDeriver } from "../../../../world-model/domain/services/snapshot-root-deriver.js";
import { DeclaredKey } from "../../../../world-model/domain/value-objects/declared-key.js";
import { PathKey } from "../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";

class DeterministicHashingPort implements WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest {
    let state = 2166136261;
    for (const byte of bytes) state = Math.imul(state ^ byte, 16777619) >>> 0;
    return Sha256Digest.fromHex(state.toString(16).padStart(8, "0").repeat(8));
  }
}

const hashingPort = new DeterministicHashingPort();
const serializer = new CanonicalJsonSerializer();
const corpusConfigDigest = hashingPort.sha256(serializer.serialize({ roots: ["docs/product"] }));
const digest = Sha256Digest.fromHex("1".repeat(64));
const sourceA = WorldNode.sourceFile({ path: PathKey.create("scripts/harness/a.ts"), digest });
const sourceB = WorldNode.sourceFile({ path: PathKey.create("scripts/harness/b.ts"), digest });
const edge = Edge.create({
  edgeType: DeclaredKey.create("references"),
  from: sourceA.id,
  to: sourceB.id,
});

const createUseCase = (batches: readonly { nodes: readonly WorldNode[]; edges: readonly Edge[]; diagnostics: [] }[]) =>
  new BuildSnapshotUseCase({
    factSource: { extract: async () => batches },
    rootDeriver: new SnapshotRootDeriver(serializer, hashingPort),
    schemaVersion: "phasegate-world-snapshot/v1",
    extractorVersion: "phasegate-world-extractor/v1",
    corpusConfigDigest,
    serializer,
  });

describe("BuildSnapshotUseCase", () => {
  it("複数extractorのfactを一つのSnapshotへ決定的に組み立てること", async () => {
    // Arrange
    const sut = createUseCase([
      { nodes: [sourceB], edges: [edge], diagnostics: [] },
      { nodes: [sourceA], edges: [edge], diagnostics: [] },
    ]);

    // Act
    const actual = await sut.execute();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:source-file:scripts/harness/a.ts",
      "pgw:v1:source-file:scripts/harness/b.ts",
    ]);
    expect(actual.edges).toHaveLength(1);
    expect(actual.extractionDiagnostics).toEqual([]);
    expect(actual.id.toString()).toBe(`pgw:v1:snapshot:${actual.corpusRoot.toString()}`);
  });

  it("extractor間のduplicate nodeにwinnerを選ばずdangling edgeをdiagnosticにすること", async () => {
    // Arrange
    const sut = createUseCase([
      { nodes: [sourceA, sourceB], edges: [edge], diagnostics: [] },
      { nodes: [sourceA], edges: [], diagnostics: [] },
    ]);

    // Act
    const actual = await sut.execute();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).toEqual(["pgw:v1:source-file:scripts/harness/b.ts"]);
    expect(actual.edges).toEqual([]);
    expect(actual.extractionDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "duplicate-node-id",
      "missing-edge-endpoint",
    ]);
  });

  it("fact batchの列挙順が変わってもcanonical bytesとcorpusRootが一致すること", async () => {
    // Arrange
    const first = createUseCase([
      { nodes: [sourceA], edges: [], diagnostics: [] },
      { nodes: [sourceB], edges: [edge], diagnostics: [] },
    ]);
    const second = createUseCase([
      { nodes: [sourceB], edges: [edge], diagnostics: [] },
      { nodes: [sourceA], edges: [], diagnostics: [] },
    ]);

    // Act
    const actual = [await first.execute(), await second.execute()];

    // Assert
    expect(actual[0].canonicalBytes).toEqual(actual[1].canonicalBytes);
    expect(actual[0].corpusRoot.toString()).toBe(actual[1].corpusRoot.toString());
  });
});
