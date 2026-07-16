// @unit world-model
// @layer test
// @work-item-id WI-287
// @story H17-02
import { describe, expect, it } from "vitest";
import { Edge } from "../../../../../world-model/domain/entities/edge.js";
import { ExtractionDiagnostic } from "../../../../../world-model/domain/entities/extraction-diagnostic.js";
import { WorldNode } from "../../../../../world-model/domain/entities/world-node.js";
import type { WorldHashingPort } from "../../../../../world-model/domain/ports/world-hashing-port.js";
import { CanonicalJsonSerializer } from "../../../../../world-model/domain/services/canonical-json-serializer.js";
import { SnapshotRootDeriver } from "../../../../../world-model/domain/services/snapshot-root-deriver.js";
import { TextContentNormalizer } from "../../../../../world-model/domain/services/text-content-normalizer.js";
import { ArtifactKind } from "../../../../../world-model/domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../../../../world-model/domain/value-objects/corpus-role.js";
import { DeclaredKey } from "../../../../../world-model/domain/value-objects/declared-key.js";
import { PathKey } from "../../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../../world-model/domain/value-objects/sha256-digest.js";
import { WorldNodeId } from "../../../../../world-model/domain/value-objects/world-node-id.js";
import { target } from "../../../../helpers/test-helpers.js";

class DeterministicHashingPort implements WorldHashingPort {
  readonly inputs: Uint8Array[] = [];

  sha256(bytes: Uint8Array): Sha256Digest {
    this.inputs.push(Uint8Array.from(bytes));
    let value = 0x811c9dc5;
    for (const byte of bytes) {
      value ^= byte;
      value = Math.imul(value, 0x01000193);
    }
    const chunk = (value >>> 0).toString(16).padStart(8, "0");
    return Sha256Digest.create(`sha256:${chunk.repeat(8)}`);
  }
}

const configDigest = Sha256Digest.create(`sha256:${"c".repeat(64)}`);
const contentDigest = Sha256Digest.create(`sha256:${"d".repeat(64)}`);

const createFixture = (reverse = false) => {
  const product = WorldNode.artifact({
    artifactKind: ArtifactKind.designDocument(),
    corpusRole: CorpusRole.product(),
    path: PathKey.create("docs/product/world.md"),
    digest: contentDigest,
    attributes: reverse ? { z: 2, a: 1 } : { a: 1, z: 2 },
  });
  const workItem = WorldNode.workItem({ workItemId: "WI-287", digest: contentDigest });
  const edge = Edge.create({
    edgeType: DeclaredKey.create("reflected-in"),
    from: workItem.id,
    to: product.id,
  });
  const diagnostic = ExtractionDiagnostic.create({
    code: "case-fold-collision",
    path: PathKey.create("docs/product/world.md"),
    payload: { paths: ["Docs/Product/world.md", "docs/product/world.md"] },
  });
  const nodes = reverse ? [workItem, product] : [product, workItem];
  return {
    schemaVersion: "phasegate-world-snapshot/v1",
    extractorVersion: "world-extractor/v1",
    corpusConfigDigest: configDigest,
    nodes,
    edges: [edge],
    extractionDiagnostics: [diagnostic],
  };
};

const createDeriver = (port = new DeterministicHashingPort()) => ({
  deriver: new SnapshotRootDeriver(new CanonicalJsonSerializer(), port),
  port,
});

target("SnapshotRootDeriver", () => {
  describe("corpusRootを決定的に導出する", () => {
    it("同じfixtureを2回導出してcanonical bytesとrootを同一にすること", () => {
      // Arrange
      const { deriver } = createDeriver();
      const fixture = createFixture();

      // Act
      const actualFirst = deriver.deriveCorpusRoot(fixture);
      const actualSecond = deriver.deriveCorpusRoot(fixture);

      // Assert
      expect(actualFirst.canonicalBytes).toEqual(actualSecond.canonicalBytes);
      expect(actualFirst.root.equals(actualSecond.root)).toBe(true);
    });

    it("node列挙順とobject key順をrootから除外すること", () => {
      // Arrange
      const { deriver } = createDeriver();

      // Act
      const actualForward = deriver.deriveCorpusRoot(createFixture(false));
      const actualReverse = deriver.deriveCorpusRoot(createFixture(true));

      // Assert
      expect(actualForward.canonicalBytes).toEqual(actualReverse.canonicalBytes);
      expect(actualForward.root.equals(actualReverse.root)).toBe(true);
    });

    it("LFとCRLFの差をnormalization後のleaf digestから除外できること", () => {
      // Arrange
      const normalizer = new TextContentNormalizer();
      const { deriver } = createDeriver();
      const lf = normalizer.normalize(new TextEncoder().encode("line1\nline2\n"));
      const crlf = normalizer.normalize(new TextEncoder().encode("line1\r\nline2\r\n"));
      expect(lf.ok && crlf.ok).toBe(true);
      if (!lf.ok || !crlf.ok) {
        throw new Error("fixture normalization failed");
      }
      const leafHasher = new DeterministicHashingPort();
      const leftDigest = leafHasher.sha256(lf.bytes);
      const rightDigest = leafHasher.sha256(crlf.bytes);
      const left = createFixture();
      const right = createFixture();
      left.nodes[0] = WorldNode.artifact({
        artifactKind: ArtifactKind.designDocument(),
        corpusRole: CorpusRole.product(),
        path: PathKey.create("docs/product/world.md"),
        digest: leftDigest,
        attributes: { a: 1, z: 2 },
      });
      right.nodes[0] = WorldNode.artifact({
        artifactKind: ArtifactKind.designDocument(),
        corpusRole: CorpusRole.product(),
        path: PathKey.create("docs/product/world.md"),
        digest: rightDigest,
        attributes: { a: 1, z: 2 },
      });

      // Act
      const actualLeft = deriver.deriveCorpusRoot(left);
      const actualRight = deriver.deriveCorpusRoot(right);

      // Assert
      expect(leftDigest.equals(rightDigest)).toBe(true);
      expect(actualLeft.root.equals(actualRight.root)).toBe(true);
    });

    it("semantic content digest・schema・extractor・config変更をrootへ反映すること", () => {
      // Arrange
      const { deriver } = createDeriver();
      const base = createFixture();
      const changedDigest = createFixture();
      changedDigest.nodes[0] = WorldNode.artifact({
        artifactKind: ArtifactKind.designDocument(),
        corpusRole: CorpusRole.product(),
        path: PathKey.create("docs/product/world.md"),
        digest: Sha256Digest.create(`sha256:${"e".repeat(64)}`),
        attributes: { a: 1, z: 2 },
      });

      // Act
      const actual = [
        deriver.deriveCorpusRoot(base).root.toString(),
        deriver.deriveCorpusRoot(changedDigest).root.toString(),
        deriver.deriveCorpusRoot({ ...base, schemaVersion: "phasegate-world-snapshot/v2" }).root.toString(),
        deriver.deriveCorpusRoot({ ...base, extractorVersion: "world-extractor/v2" }).root.toString(),
        deriver
          .deriveCorpusRoot({
            ...base,
            corpusConfigDigest: Sha256Digest.create(`sha256:${"f".repeat(64)}`),
          })
          .root.toString(),
      ];

      // Assert
      expect(new Set(actual).size).toBe(actual.length);
    });

    it("Snapshot IDとroot自身をpreimageへ戻さないこと", () => {
      // Arrange
      const { deriver } = createDeriver();
      const fixture = createFixture();

      // Act
      const actual = deriver.buildSnapshot(fixture);

      // Assert
      expect(actual.id.toString()).toBe(`pgw:v1:snapshot:${actual.corpusRoot.toString()}`);
      const canonical = new TextDecoder().decode(actual.canonicalBytes);
      expect(canonical).not.toContain("corpusRoot");
      expect(canonical).not.toContain("snapshotId");
    });

    it("constraintRootとevaluationIdを関連づけてもSnapshot IDを変えないこと", () => {
      // Arrange
      const { deriver } = createDeriver();
      const snapshot = deriver.buildSnapshot(createFixture());
      const constraintRoot = Sha256Digest.create(`sha256:${"2".repeat(64)}`);
      const evaluation = deriver.deriveEvaluationId({
        schemaVersion: "phasegate-world-evaluation/v1",
        rulesetVersion: "world-rules/v1",
        corpusRoot: snapshot.corpusRoot,
        constraintRoot,
        evaluationConfigDigest: Sha256Digest.create(`sha256:${"3".repeat(64)}`),
        policyInputsDigest: Sha256Digest.create(`sha256:${"4".repeat(64)}`),
      });

      // Act
      const actual = snapshot.withEvaluationRoots(constraintRoot, evaluation.evaluationId);

      // Assert
      expect(actual.id.equals(snapshot.id)).toBe(true);
      expect(actual.corpusRoot.equals(snapshot.corpusRoot)).toBe(true);
      expect(actual.constraintRoot?.equals(constraintRoot)).toBe(true);
      expect(actual.evaluationId?.equals(evaluation.evaluationId)).toBe(true);
    });
  });

  describe("constraintRootとevaluationIdを別preimageから導出する", () => {
    it("constraint・claim・alias列挙順に依存しないこと", () => {
      // Arrange
      const { deriver } = createDeriver();
      const constraintA = {
        id: WorldNodeId.constraint(DeclaredKey.create("world-model.a")),
        value: { pin: contentDigest.toString() },
      };
      const constraintB = {
        id: WorldNodeId.constraint(DeclaredKey.create("world-model.b")),
        value: { pin: configDigest.toString() },
      };
      const input = {
        schemaVersion: "phasegate-world-constraints/v1",
        rulesetVersion: "world-rules/v1",
        constraintConfigDigest: configDigest,
        constraints: [constraintA, constraintB],
        explicitClaims: [],
        aliases: [],
        declarationDiagnostics: [],
      };

      // Act
      const actualForward = deriver.deriveConstraintRoot(input);
      const actualReverse = deriver.deriveConstraintRoot({
        ...input,
        constraints: [constraintB, constraintA],
      });

      // Assert
      expect(actualForward.canonicalBytes).toEqual(actualReverse.canonicalBytes);
      expect(actualForward.root.equals(actualReverse.root)).toBe(true);
    });

    it("pinまたはrulesetVersion変更でconstraintRootを変えること", () => {
      // Arrange
      const { deriver } = createDeriver();
      const base = {
        schemaVersion: "phasegate-world-constraints/v1",
        rulesetVersion: "world-rules/v1",
        constraintConfigDigest: configDigest,
        constraints: [
          {
            id: WorldNodeId.constraint(DeclaredKey.create("world-model.a")),
            value: { pin: contentDigest.toString() },
          },
        ],
        explicitClaims: [],
        aliases: [],
        declarationDiagnostics: [],
      };

      // Act
      const actualBase = deriver.deriveConstraintRoot(base);
      const actualPin = deriver.deriveConstraintRoot({
        ...base,
        constraints: [
          {
            id: base.constraints[0].id,
            value: { pin: Sha256Digest.create(`sha256:${"e".repeat(64)}`).toString() },
          },
        ],
      });
      const actualRuleset = deriver.deriveConstraintRoot({ ...base, rulesetVersion: "world-rules/v2" });

      // Assert
      expect(actualBase.root.equals(actualPin.root)).toBe(false);
      expect(actualBase.root.equals(actualRuleset.root)).toBe(false);
    });

    it("six-field evaluation inputの各semantic digest変更をIDへ反映すること", () => {
      // Arrange
      const { deriver } = createDeriver();
      const base = {
        schemaVersion: "phasegate-world-evaluation/v1",
        rulesetVersion: "world-rules/v1",
        corpusRoot: Sha256Digest.create(`sha256:${"1".repeat(64)}`),
        constraintRoot: Sha256Digest.create(`sha256:${"2".repeat(64)}`),
        evaluationConfigDigest: Sha256Digest.create(`sha256:${"3".repeat(64)}`),
        policyInputsDigest: Sha256Digest.create(`sha256:${"4".repeat(64)}`),
      };

      // Act
      const actual = [
        deriver.deriveEvaluationId(base).evaluationId.toString(),
        deriver
          .deriveEvaluationId({
            ...base,
            corpusRoot: Sha256Digest.create(`sha256:${"5".repeat(64)}`),
          })
          .evaluationId.toString(),
        deriver
          .deriveEvaluationId({
            ...base,
            constraintRoot: Sha256Digest.create(`sha256:${"6".repeat(64)}`),
          })
          .evaluationId.toString(),
        deriver
          .deriveEvaluationId({
            ...base,
            policyInputsDigest: Sha256Digest.create(`sha256:${"7".repeat(64)}`),
          })
          .evaluationId.toString(),
      ];

      // Assert
      expect(new Set(actual).size).toBe(actual.length);
    });

    it("finding順やreport formattingをidentity inputに含めず同じIDを返すこと", () => {
      // Arrange
      const { deriver } = createDeriver();
      const identityInput = {
        schemaVersion: "phasegate-world-evaluation/v1",
        rulesetVersion: "world-rules/v1",
        corpusRoot: Sha256Digest.create(`sha256:${"1".repeat(64)}`),
        constraintRoot: Sha256Digest.create(`sha256:${"2".repeat(64)}`),
        evaluationConfigDigest: Sha256Digest.create(`sha256:${"3".repeat(64)}`),
        policyInputsDigest: Sha256Digest.create(`sha256:${"4".repeat(64)}`),
      };
      const envelopeA = { identityInput, findings: ["a", "b"], report: "{ pretty }" };
      const envelopeB = { identityInput, findings: ["b", "a"], report: '{"compact":true}' };

      // Act
      const actualA = deriver.deriveEvaluationId(envelopeA.identityInput);
      const actualB = deriver.deriveEvaluationId(envelopeB.identityInput);

      // Assert
      expect(actualA.canonicalBytes).toEqual(actualB.canonicalBytes);
      expect(actualA.evaluationId.equals(actualB.evaluationId)).toBe(true);
    });

    it("同じevaluation inputを2回導出してbyte-identicalにすること", () => {
      // Arrange
      const { deriver } = createDeriver();
      const input = {
        schemaVersion: "phasegate-world-evaluation/v1",
        rulesetVersion: "world-rules/v1",
        corpusRoot: Sha256Digest.create(`sha256:${"1".repeat(64)}`),
        constraintRoot: Sha256Digest.create(`sha256:${"2".repeat(64)}`),
        evaluationConfigDigest: Sha256Digest.create(`sha256:${"3".repeat(64)}`),
        policyInputsDigest: Sha256Digest.create(`sha256:${"4".repeat(64)}`),
      };

      // Act
      const actualFirst = deriver.deriveEvaluationId(input);
      const actualSecond = deriver.deriveEvaluationId(input);

      // Assert
      expect(actualFirst.canonicalBytes).toEqual(actualSecond.canonicalBytes);
      expect(actualFirst.evaluationId.equals(actualSecond.evaluationId)).toBe(true);
    });
  });
});
