// @unit world-model
// @layer test
// @work-item-id WI-293
// @story H17-07
// @ac H17-07-2
// @ac H17-07-5

import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../../../world-model/domain/entities/snapshot.js";
import { WorldNode } from "../../../../../world-model/domain/entities/world-node.js";
import { ChangeProvenance } from "../../../../../world-model/domain/value-objects/change-provenance.js";
import { PathKey } from "../../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../../world-model/domain/value-objects/sha256-digest.js";

const digest = (value: string): Sha256Digest => Sha256Digest.fromHex(value.repeat(64));

const node = (path: string, value: string): WorldNode =>
  WorldNode.sourceFile({ path: PathKey.create(path), digest: digest(value) });

const snapshot = (nodes: readonly WorldNode[], root: string): Snapshot =>
  Snapshot.create({
    schemaVersion: "phasegate-world-snapshot/v1",
    extractorVersion: "phasegate-world-extractor/v2",
    corpusConfigDigest: digest("c"),
    nodes,
    edges: [],
    extractionDiagnostics: [],
    corpusRoot: digest(root),
    canonicalBytes: new TextEncoder().encode(root),
  });

describe("ChangeProvenance", () => {
  it("renameを推論せずold removedとnew addedとしてcanonical順に表すこと", () => {
    // Arrange
    const baseline = snapshot([node("docs/old.md", "a")], "1");
    const current = snapshot([node("docs/new.md", "a")], "2");

    // Act
    const actual = ChangeProvenance.between(baseline, current);

    // Assert
    expect(
      actual.changedCandidates.map((candidate) => ({
        nodeId: candidate.nodeId.toString(),
        changeKind: candidate.changeKind,
      })),
    ).toEqual([
      { nodeId: "pgw:v1:source-file:docs/new.md", changeKind: "added" },
      { nodeId: "pgw:v1:source-file:docs/old.md", changeKind: "removed" },
    ]);
    expect(actual.toCanonicalValue()).not.toHaveProperty("cause");
    expect(actual.toCanonicalValue()).not.toHaveProperty("renamedTo");
  });

  it("digest変更とcandidate cardinality変更を区別すること", () => {
    // Arrange
    const unique = node("docs/a.md", "a");
    const baseline = snapshot([unique, node("docs/b.md", "b")], "1");
    const current = snapshot([node("docs/a.md", "c"), node("docs/b.md", "b"), node("docs/b.md", "b")], "2");

    // Act
    const actual = ChangeProvenance.between(baseline, current);

    // Assert
    expect(actual.changedCandidates.map((candidate) => candidate.changeKind)).toEqual([
      "modified",
      "candidate-cardinality-changed",
    ]);
  });
});
