// @unit world-model
// @layer test
// @work-item-id WI-287
// @story H17-02
import { describe, expect, it } from "vitest";
import { ArtifactKind } from "../../../../../world-model/domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../../../../world-model/domain/value-objects/corpus-role.js";
import { DeclaredKey } from "../../../../../world-model/domain/value-objects/declared-key.js";
import { PathKey } from "../../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../../world-model/domain/value-objects/sha256-digest.js";
import { WorldNodeId } from "../../../../../world-model/domain/value-objects/world-node-id.js";
import { target } from "../../../../helpers/test-helpers.js";

target("WorldNodeId", () => {
  describe("ADR-032のnode type別IDを生成して解析する", () => {
    it("全ID形式がcanonical文字列へround-tripすること", () => {
      // Arrange
      const path = PathKey.create("docs/product/世界 model.md");
      const key = DeclaredKey.create("world-model.snapshot");
      const digest = Sha256Digest.create(`sha256:${"a".repeat(64)}`);
      const ids = [
        WorldNodeId.artifact(ArtifactKind.designDocument(), CorpusRole.product(), path),
        WorldNodeId.sourceFile(PathKey.create("scripts/harness/main.ts")),
        WorldNodeId.fragment(CorpusRole.product(), key),
        WorldNodeId.legacyFragment(ArtifactKind.designDocument(), CorpusRole.inception(), path),
        WorldNodeId.workItem("WI-287"),
        WorldNodeId.testReference({
          storyId: "H17-02",
          acId: "AC-1",
          binding: "ac",
          testType: "unit",
          filePath: PathKey.create("scripts/harness/a test.test.ts"),
          testName: "日本語のtest",
        }),
        WorldNodeId.explicitClaim(DeclaredKey.create("world-model.claim")),
        WorldNodeId.constraint(DeclaredKey.create("world-model.constraint")),
        WorldNodeId.snapshot(digest),
      ];

      // Act
      const actual = ids.map((id) => WorldNodeId.parse(id.toString()));

      // Assert
      expect(actual.map((id) => id.toString())).toEqual(ids.map((id) => id.toString()));
      expect(actual.map((id) => id.nodeType)).toEqual([
        "artifact",
        "source-file",
        "fragment",
        "fragment",
        "work-item",
        "test-reference",
        "explicit-claim",
        "constraint",
        "snapshot",
      ]);
      expect(ids[0].toString()).toContain("docs/product/%E4%B8%96%E7%95%8C%20model.md");
      expect(ids[5].toString()).toContain(":name:value:%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%81%AEtest");
    });

    it("明示FragmentのIDがfile pathやheading情報に依存しないこと", () => {
      // Arrange
      const role = CorpusRole.product();
      const key = DeclaredKey.create("world-model.identity");
      const artifactBefore = WorldNodeId.artifact(
        ArtifactKind.designDocument(),
        role,
        PathKey.create("docs/product/before.md"),
      );
      const artifactAfter = WorldNodeId.artifact(
        ArtifactKind.designDocument(),
        role,
        PathKey.create("docs/product/after.md"),
      );

      // Act
      const actualBefore = WorldNodeId.fragment(role, key);
      const actualAfter = WorldNodeId.fragment(role, key);

      // Assert
      expect(artifactBefore.equals(artifactAfter)).toBe(false);
      expect(actualBefore.equals(actualAfter)).toBe(true);
      expect(actualBefore.toString()).toBe("pgw:v1:fragment:product:world-model.identity");
    });

    it("productとinceptionを同一Fragmentとして扱わないこと", () => {
      // Arrange
      const key = DeclaredKey.create("world-model.identity");

      // Act
      const actualProduct = WorldNodeId.fragment(CorpusRole.product(), key);
      const actualInception = WorldNodeId.fragment(CorpusRole.inception(), key);

      // Assert
      expect(actualProduct.equals(actualInception)).toBe(false);
    });
  });

  describe("不正または非canonicalなIDを解析する", () => {
    it.each([
      "pgw:v2:work-item:WI-287",
      "pgw:v1:work-item:not-a-wi",
      "pgw:v1:artifact:source:product:src/a.ts",
      "pgw:v1:artifact:design-document:generated:docs/a.md",
      "pgw:v1:fragment:product:Invalid.Key",
      "pgw:v1:source-file:docs/%2fsecret.md",
      "pgw:v1:test-reference:H17-02:AC-1:semantic:unit:a.ts:name:none",
      `pgw:v1:snapshot:sha256:${"A".repeat(64)}`,
    ])("%sをfail-closedで拒否すること", (input) => {
      // Arrange
      const act = () => WorldNodeId.parse(input);

      // Act
      const actual = act;

      // Assert
      expect(actual).toThrowError();
    });
  });
});
