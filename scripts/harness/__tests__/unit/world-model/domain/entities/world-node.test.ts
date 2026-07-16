// @unit world-model
// @layer test
// @work-item-id WI-287
// @story H17-02
import { describe, expect, it } from "vitest";
import { Edge } from "../../../../../world-model/domain/entities/edge.js";
import { ExtractionDiagnostic } from "../../../../../world-model/domain/entities/extraction-diagnostic.js";
import { WorldNode } from "../../../../../world-model/domain/entities/world-node.js";
import { ArtifactKind } from "../../../../../world-model/domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../../../../world-model/domain/value-objects/corpus-role.js";
import { DeclaredKey } from "../../../../../world-model/domain/value-objects/declared-key.js";
import { PathKey } from "../../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../../world-model/domain/value-objects/sha256-digest.js";
import { target } from "../../../../helpers/test-helpers.js";

const digest = Sha256Digest.create(`sha256:${"1".repeat(64)}`);

target("WorldNode / Edge / ExtractionDiagnostic", () => {
  describe("type固有のWorld node projectionを作る", () => {
    it("Artifact・SourceFile・明示Fragment・legacy Fragmentを区別すること", () => {
      // Arrange
      const documentPath = PathKey.create("docs/product/world.md");
      const sourcePath = PathKey.create("scripts/harness/main.ts");
      const kind = ArtifactKind.designDocument();

      // Act
      const actual = [
        WorldNode.artifact({ artifactKind: kind, corpusRole: CorpusRole.product(), path: documentPath, digest }),
        WorldNode.sourceFile({ path: sourcePath, digest }),
        WorldNode.explicitFragment({
          corpusRole: CorpusRole.product(),
          declaredKey: DeclaredKey.create("world-model.snapshot"),
          artifactId: WorldNode.artifact({
            artifactKind: kind,
            corpusRole: CorpusRole.product(),
            path: documentPath,
            digest,
          }).id,
          digest,
        }),
        WorldNode.legacyFragment({
          artifactKind: kind,
          corpusRole: CorpusRole.inception(),
          path: PathKey.create("docs/inception/world.md"),
          artifactId: WorldNode.artifact({
            artifactKind: kind,
            corpusRole: CorpusRole.inception(),
            path: PathKey.create("docs/inception/world.md"),
            digest,
          }).id,
          digest,
        }),
      ];

      // Assert
      expect(actual.map((node) => node.toCanonicalValue().projection)).toEqual([
        {
          type: "artifact",
          artifactKind: "design-document",
          corpusRole: "product",
          pathKey: "docs/product/world.md",
        },
        { type: "source-file", pathKey: "scripts/harness/main.ts" },
        {
          type: "fragment",
          identityMode: "explicit",
          corpusRole: "product",
          artifactId: "pgw:v1:artifact:design-document:product:docs/product/world.md",
        },
        {
          type: "fragment",
          identityMode: "legacy-whole-file",
          corpusRole: "inception",
          artifactId: "pgw:v1:artifact:design-document:inception:docs/inception/world.md",
        },
      ]);
    });
  });

  describe("有向edgeとdiagnosticをcanonical projectionする", () => {
    it("fromとtoを入れ替えずqualifierを保持すること", () => {
      // Arrange
      const from = WorldNode.workItem({ workItemId: "WI-287", digest }).id;
      const to = WorldNode.sourceFile({ path: PathKey.create("scripts/harness/main.ts"), digest }).id;

      // Act
      const actual = Edge.create({
        edgeType: DeclaredKey.create("implemented-in"),
        from,
        to,
        qualifier: { scope: "domain" },
      });

      // Assert
      expect(actual.toCanonicalValue()).toEqual({
        edgeType: "implemented-in",
        from: "pgw:v1:work-item:WI-287",
        qualifier: { scope: "domain" },
        to: "pgw:v1:source-file:scripts/harness/main.ts",
      });
    });

    it("diagnosticにseverityやblockingを持ち込まないこと", () => {
      // Arrange
      const path = PathKey.create("docs/product/world.md");

      // Act
      const actual = ExtractionDiagnostic.create({
        code: "duplicate-node-id",
        path,
        line: 12,
        payload: { candidates: 2 },
      });

      // Assert
      expect(actual.toCanonicalValue()).toEqual({
        code: "duplicate-node-id",
        line: 12,
        nodeId: null,
        pathKey: "docs/product/world.md",
        payload: { candidates: 2 },
      });
      expect(actual.toCanonicalValue()).not.toHaveProperty("severity");
      expect(actual.toCanonicalValue()).not.toHaveProperty("blocking");
    });
  });
});
