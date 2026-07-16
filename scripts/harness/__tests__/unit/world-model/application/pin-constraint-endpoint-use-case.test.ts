// @unit world-model
// @layer test
// @work-item-id WI-296
// @story H17-10
// @ac H17-10-1
// @ac H17-10-4

import { describe, expect, it } from "vitest";
import type {
  ConstraintDeclarationRepositoryPort,
  ConstraintDeclarationSet,
} from "../../../../world-model/application/ports/world-control-declaration-repository-port.js";
import { PinConstraintEndpointUseCase } from "../../../../world-model/application/usecases/pin-constraint-endpoint-use-case.js";
import {
  ConstraintRecord,
  MalformedConstraintDeclaration,
} from "../../../../world-model/domain/entities/constraint-record.js";
import { ExtractionDiagnostic } from "../../../../world-model/domain/entities/extraction-diagnostic.js";
import { Snapshot } from "../../../../world-model/domain/entities/snapshot.js";
import { WorldNode } from "../../../../world-model/domain/entities/world-node.js";
import { ArtifactKind } from "../../../../world-model/domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../../../world-model/domain/value-objects/corpus-role.js";
import { DeclaredKey } from "../../../../world-model/domain/value-objects/declared-key.js";
import { ExplicitNodeAlias } from "../../../../world-model/domain/value-objects/explicit-node-alias.js";
import { NodePin } from "../../../../world-model/domain/value-objects/node-pin.js";
import { PathKey } from "../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";
import { WcrRuleId } from "../../../../world-model/domain/value-objects/wcr-rule-id.js";
import { WorldNodeId } from "../../../../world-model/domain/value-objects/world-node-id.js";

const digest = (character: string): Sha256Digest => Sha256Digest.fromHex(character.repeat(64));
const source = (filePath: string, character: string): WorldNode =>
  WorldNode.sourceFile({ path: PathKey.create(filePath), digest: digest(character) });
const declarationArtifactId = WorldNodeId.artifact(
  ArtifactKind.externalDeclaration(),
  CorpusRole.external(),
  PathKey.create("phasegate.world-constraints.json"),
);
const constraintId = WorldNodeId.constraint(DeclaredKey.create("world.pin-test"));
const pinnedNodeId = WorldNodeId.sourceFile(PathKey.create("scripts/harness/old.ts"));

const record = ConstraintRecord.create({
  constraintId,
  schemaVersion: "phasegate-world-constraints/v1",
  factType: "content-equals",
  claimant: NodePin.create({ nodeId: pinnedNodeId, contentDigest: digest("a") }),
  premise: NodePin.create({ nodeId: pinnedNodeId, contentDigest: digest("a") }),
  applicableRuleIds: [WcrRuleId.create("WCR-008")],
  declarationArtifactId,
  declarationLocator: "/constraints/0",
});

const snapshot = (nodes: readonly WorldNode[], diagnostics: readonly ExtractionDiagnostic[] = []): Snapshot =>
  Snapshot.create({
    schemaVersion: "phasegate-world-snapshot/v1",
    extractorVersion: "phasegate-world-extractor/v2",
    corpusConfigDigest: digest("c"),
    nodes,
    edges: [],
    extractionDiagnostics: diagnostics,
    corpusRoot: digest("d"),
    canonicalBytes: new TextEncoder().encode("{}"),
  });

const declarationSet = (
  aliases: readonly ExplicitNodeAlias[] = [],
  malformedDeclarations: readonly MalformedConstraintDeclaration[] = [],
): ConstraintDeclarationSet => ({
  schemaVersion: "phasegate-world-constraints/v1",
  records: [record],
  malformedDeclarations,
  aliases,
  relations: [],
  diagnostics: [],
});

const repository = (set: ConstraintDeclarationSet) => {
  const writes: unknown[] = [];
  const port: ConstraintDeclarationRepositoryPort = {
    load: async () => ({ state: "loaded", value: set, diagnostics: [] }),
    replaceAtomically: async (document) => {
      writes.push(document);
      return { state: "written", path: "phasegate.world-constraints.json" };
    },
  };
  return { port, writes };
};

const execute = async (currentSnapshot: Snapshot, set: ConstraintDeclarationSet) => {
  const declarations = repository(set);
  const sut = new PinConstraintEndpointUseCase({ execute: async () => currentSnapshot }, declarations.port);
  const result = await sut.execute({
    constraintId: constraintId.toString(),
    endpoint: "claimant",
    apply: true,
  });
  return { result, writes: declarations.writes };
};

describe("PinConstraintEndpointUseCase", () => {
  it("missing・duplicate・ambiguous endpointではcandidateを確定せず一度もwriteしないこと", async () => {
    // Arrange
    const targetA = source("scripts/harness/a.ts", "b");
    const targetB = source("scripts/harness/b.ts", "c");
    const duplicate = ExtractionDiagnostic.create({
      code: "duplicate-node-id",
      nodeId: pinnedNodeId,
      payload: { candidates: 2 },
    });
    const ambiguousAliases = [
      ExplicitNodeAlias.create({ from: pinnedNodeId, to: targetA.id }),
      ExplicitNodeAlias.create({ from: pinnedNodeId, to: targetB.id }),
    ];

    // Act
    const missing = await execute(snapshot([]), declarationSet());
    const duplicated = await execute(snapshot([], [duplicate]), declarationSet());
    const ambiguous = await execute(snapshot([targetA, targetB]), declarationSet(ambiguousAliases));

    // Assert
    expect([missing.result, duplicated.result, ambiguous.result]).toEqual([
      {
        status: "domain-failure",
        code: "missing-endpoint",
        message: `endpoint cannot be resolved uniquely: ${pinnedNodeId}`,
      },
      {
        status: "domain-failure",
        code: "duplicate-endpoint",
        message: `duplicate endpoint: ${pinnedNodeId}`,
      },
      {
        status: "domain-failure",
        code: "ambiguous-endpoint-alias",
        message: `endpoint cannot be resolved uniquely: ${pinnedNodeId}`,
      },
    ]);
    expect([...missing.writes, ...duplicated.writes, ...ambiguous.writes]).toEqual([]);
  });

  it("supported schema内のmalformed declarationがあれば解決前にfail-closedしてwriteしないこと", async () => {
    // Arrange
    const malformed = MalformedConstraintDeclaration.create({
      declaredConstraintId: "broken",
      declarationArtifactId,
      declarationLocator: "/constraints/1",
      reasons: ["claimant is malformed"],
    });

    // Act
    const actual = await execute(snapshot([source("scripts/harness/old.ts", "b")]), declarationSet([], [malformed]));

    // Assert
    expect(actual.result).toEqual({
      status: "domain-failure",
      code: "malformed-constraint-declaration",
      message: "constraint declarations contain malformed or ambiguous candidates",
    });
    expect(actual.writes).toEqual([]);
  });
});
