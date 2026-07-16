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
import { target } from "../../../../helpers/test-helpers.js";

target("World identity value objects", () => {
  describe("PathKeyを正規化する", () => {
    it("dot segmentと重複separatorを除去すること", () => {
      // Arrange
      const input = "./docs//product/./世界.md";

      // Act
      const actual = PathKey.create(input);

      // Assert
      expect(actual.toString()).toBe("docs/product/世界.md");
      expect(actual.toEncodedString()).toBe("docs/product/%E4%B8%96%E7%95%8C.md");
    });

    it.each([
      "",
      "/etc/passwd",
      "C:/repo/file.ts",
      "docs\\file.md",
      "docs/../file.md",
    ])("%sをproject-relative pathとして拒否すること", (input) => {
      // Arrange
      const act = () => PathKey.create(input);

      // Act
      const actual = act;

      // Assert
      expect(actual).toThrowError();
    });

    it("caseとUnicode code point sequenceを保持すること", () => {
      // Arrange
      const nfc = PathKey.create("docs/Café.md");
      const nfd = PathKey.create("docs/Cafe\u0301.md");

      // Act
      const actual = [nfc.toString(), nfd.toString()];

      // Assert
      expect(actual[0]).not.toBe(actual[1]);
      expect(PathKey.create("Docs/File.md").equals(PathKey.create("docs/file.md"))).toBe(false);
    });
  });

  describe("DeclaredKeyとdigestを検証する", () => {
    it("canonical valueをimmutable VOとして生成すること", () => {
      // Arrange
      const digestValue = `sha256:${"0".repeat(64)}`;

      // Act
      const actualKey = DeclaredKey.create("world-model.snapshot-v1");
      const actualDigest = Sha256Digest.create(digestValue);

      // Assert
      expect(actualKey.toString()).toBe("world-model.snapshot-v1");
      expect(actualDigest.toString()).toBe(digestValue);
    });

    it.each(["World.Model", "world model", "world..model", "-world"])("DeclaredKey %sを拒否すること", (input) => {
      // Arrange
      const act = () => DeclaredKey.create(input);

      // Act
      const actual = act;

      // Assert
      expect(actual).toThrowError();
    });

    it.each([
      `sha1:${"0".repeat(64)}`,
      `sha256:${"0".repeat(63)}`,
      `sha256:${"A".repeat(64)}`,
    ])("digest %sを拒否すること", (input) => {
      // Arrange
      const act = () => Sha256Digest.create(input);

      // Act
      const actual = act;

      // Assert
      expect(actual).toThrowError();
    });
  });

  describe("artifact kindとcorpus roleの組を検証する", () => {
    it("ADR-031の4 artifact kindと5 corpus roleを生成できること", () => {
      // Arrange
      const kinds = [
        ArtifactKind.designDocument(),
        ArtifactKind.source(),
        ArtifactKind.generatedArtifact(),
        ArtifactKind.externalDeclaration(),
      ];
      const roles = [
        CorpusRole.product(),
        CorpusRole.inception(),
        CorpusRole.adr(),
        CorpusRole.generated(),
        CorpusRole.external(),
      ];

      // Act
      const actual = {
        kinds: kinds.map((value) => value.toString()),
        roles: roles.map((value) => value.toString()),
      };

      // Assert
      expect(actual.kinds).toEqual(["design-document", "source", "generated-artifact", "external-declaration"]);
      expect(actual.roles).toEqual(["product", "inception", "adr", "generated", "external"]);
    });
  });
});
