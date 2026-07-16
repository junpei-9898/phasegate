// @unit world-model
// @layer test
// @work-item-id WI-289
// @story H17-04

import { describe, expect, it } from "vitest";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { CorpusRole } from "../../../../world-model/domain/value-objects/corpus-role.js";
import { PathKey } from "../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";
import { MarkdownDesignFactExtractor } from "../../../../world-model/infrastructure/adapters/markdown-design-fact-extractor.js";

class ByteSensitiveHashingPort implements WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest {
    let value = 0;
    for (const byte of bytes) value = (value * 31 + byte) >>> 0;
    return Sha256Digest.fromHex(value.toString(16).padStart(8, "0").repeat(8));
  }
}

const extract = (content: string) =>
  new MarkdownDesignFactExtractor({ hashingPort: new ByteSensitiveHashingPort() }).extractFile({
    path: PathKey.create("docs/product/example.md"),
    role: CorpusRole.product(),
    bytes: new TextEncoder().encode(content),
  });

describe("Markdown design fact extraction", () => {
  it("validなmetadata preludeをheadingへbindしてexplicit Fragmentだけを返すこと", () => {
    // Arrange
    const content = [
      "<!-- @world-fragment-migration complete -->",
      "<!-- @world-fragment-id world.example -->",
      "<!-- @work-item-id WI-289 — historical note -->",
      "## Example heading",
      "Body",
    ].join("\n");

    // Act
    const actual = extract(content);

    // Assert
    expect(actual.nodeCandidates.map((candidate) => candidate.node.id.toString())).toEqual([
      "pgw:v1:artifact:design-document:product:docs/product/example.md",
      "pgw:v1:fragment:product:world.example",
    ]);
    expect(actual.nodeCandidates[1].node.attributes).toEqual(
      expect.objectContaining({
        locator: {
          endLine: 5,
          headingLevel: 2,
          headingLine: 4,
          headingText: "Example heading",
          markerLine: 2,
          startLine: 4,
        },
        migrationState: "explicit",
      }),
    );
    expect(actual.workItemReferences).toEqual([
      expect.objectContaining({
        sourceNodeId: expect.objectContaining({ value: "pgw:v1:fragment:product:world.example" }),
        workItemId: "WI-289",
        line: 3,
      }),
    ]);
    expect(actual.diagnostics).toEqual([]);
  });

  it("markerの有無とcompletionに応じてwhole-file・mixed・explicitを区別すること", () => {
    // Arrange
    const wholeFile = "# Whole file\nBody\n";
    const mixed = "<!-- @world-fragment-id world.mixed -->\n# Mixed\nBody\n";
    const explicit =
      "<!-- @world-fragment-migration complete -->\n<!-- @world-fragment-id world.explicit -->\n# Explicit\nBody\n";

    // Act
    const actual = [extract(wholeFile), extract(mixed), extract(explicit)];

    // Assert
    expect(
      actual.map((result) =>
        result.nodeCandidates.map(
          (candidate) => candidate.node.projection.type === "fragment" && candidate.node.projection.identityMode,
        ),
      ),
    ).toEqual([
      [false, "legacy-whole-file"],
      [false, "explicit", "legacy-whole-file"],
      [false, "explicit"],
    ]);
  });

  it("CRLFとLFのtransport差でArtifactとFragment digestを変えないこと", () => {
    // Arrange
    const lf = "<!-- @world-fragment-id world.lines -->\n# Lines\nBody\n";
    const crlf = lf.replaceAll("\n", "\r\n");

    // Act
    const actual = [extract(lf), extract(crlf)];

    // Assert
    expect(actual[0].nodeCandidates.map((candidate) => candidate.node.contentDigest.toString())).toEqual(
      actual[1].nodeCandidates.map((candidate) => candidate.node.contentDigest.toString()),
    );
  });

  it("orphan・malformed・invalid completionをsilent omissionせずfenced exampleは無視すること", () => {
    // Arrange
    const content = [
      "<!-- @world-fragment-migration complete -->",
      "```md",
      "<!-- @world-fragment-id example.ignored -->",
      "# Ignored",
      "```",
      "<!-- @world-fragment-id orphan.key -->",
      "",
      "# Orphan",
      "<!-- @world-fragment-id INVALID KEY -->",
    ].join("\n");

    // Act
    const actual = extract(content);

    // Assert
    expect(actual.nodeCandidates.map((candidate) => candidate.node.id.nodeType)).toEqual(["artifact", "fragment"]);
    expect(actual.nodeCandidates[1].node.projection).toEqual(
      expect.objectContaining({ identityMode: "legacy-whole-file" }),
    );
    expect(actual.diagnostics.map((entry) => entry.code)).toEqual([
      "malformed-fragment-marker",
      "migration-complete-without-fragments",
      "orphan-fragment-marker",
    ]);
  });
});
