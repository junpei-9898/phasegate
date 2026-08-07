/**
 * @layer domain
 * @unit agent-integration
 * @story H11-02
 * @work-item-id WI-384
 */

import { describe, expect, it } from "vitest";
import { ApplyPatchWriteTargetExtractor } from "../../../agent-integration/domain/services/apply-patch-write-target-extractor.js";

describe("ApplyPatchWriteTargetExtractor", () => {
  it("Update directive から変更対象と MODIFY 種別を抽出すること", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = "*** Begin Patch\n*** Update File: src/existing.ts\n@@\n-old\n+new\n*** End Patch";

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([{ filePath: "src/existing.ts", changeKind: "MODIFY" }]);
  });

  it("Move to 付き Update は移動元を MODIFY、移動先を CREATE として順に抽出すること", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = [
      "*** Begin Patch",
      "*** Update File: docs/x.md",
      "*** Move to: .husky/post-checkout",
      "@@",
      "-old",
      "+new",
      "*** End Patch",
    ].join("\n");

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([
      { filePath: "docs/x.md", changeKind: "MODIFY" },
      { filePath: ".husky/post-checkout", changeKind: "CREATE" },
    ]);
  });

  it("Add directive から作成対象と CREATE 種別を抽出すること", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = "*** Begin Patch\n*** Add File: src/created.ts\n+created\n*** End Patch";

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([{ filePath: "src/created.ts", changeKind: "CREATE" }]);
  });

  it("Delete directive から削除対象と DELETE 種別を抽出すること", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = "*** Begin Patch\n*** Delete File: src/deleted.ts\n*** End Patch";

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([{ filePath: "src/deleted.ts", changeKind: "DELETE" }]);
  });

  it("Update と Add と Delete が混在する patch を directive 順に抽出すること", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = [
      "*** Begin Patch",
      "*** Update File: src/a.ts",
      "@@",
      "-a",
      "+updated",
      "*** Add File: src/b.ts",
      "+created",
      "*** Delete File: src/c.ts",
      "*** End Patch",
    ].join("\n");

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([
      { filePath: "src/a.ts", changeKind: "MODIFY" },
      { filePath: "src/b.ts", changeKind: "CREATE" },
      { filePath: "src/c.ts", changeKind: "DELETE" },
    ]);
  });

  it("前後空白を除いた space 入り path を保持すること", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = "*** Begin Patch\n*** Update File:   docs/path with spaces.md   \n*** End Patch";

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([{ filePath: "docs/path with spaces.md", changeKind: "MODIFY" }]);
  });

  it("同じ path と種別の directive が重複する場合は最初の対象だけを返すこと", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = [
      "*** Begin Patch",
      "*** Update File: src/same.ts",
      "*** Update File: src/same.ts",
      "*** End Patch",
    ].join("\n");

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([{ filePath: "src/same.ts", changeKind: "MODIFY" }]);
  });

  it("End marker が欠けた patch は入力末尾まで対象を抽出すること", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = "*** Begin Patch\n*** Add File: src/unclosed.ts\n+content";

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([{ filePath: "src/unclosed.ts", changeKind: "CREATE" }]);
  });

  it("marker 外と hunk 本文に現れる類似 directive を対象に数えないこと", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = [
      "*** Update File: outside.ts",
      "*** Begin Patch",
      "*** Update File: src/real.ts",
      "@@",
      " *** Add File: hunk-content.ts",
      "*** End Patch",
      "*** Delete File: outside-after.ts",
    ].join("\n");

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([{ filePath: "src/real.ts", changeKind: "MODIFY" }]);
  });

  it("行頭に空白がある file directive は Codex raw patch 文法外として抽出しないこと", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patch = ["*** Begin Patch", " *** Update File: src/indented.ts", "*** End Patch"].join("\n");

    // Act
    const actual = extractor.extract(patch);

    // Assert
    expect(actual).toEqual([]);
  });

  it("空文字または Begin marker のない入力は同じ frozen empty result を返すこと", () => {
    // Arrange
    const extractor = new ApplyPatchWriteTargetExtractor();

    // Act
    const actual = [extractor.extract(""), extractor.extract("*** Update File: src/outside.ts")];

    // Assert
    expect(actual).toEqual([[], []]);
    expect(Object.isFrozen(actual[0])).toBe(true);
    expect(Object.isFrozen(actual[1])).toBe(true);
  });
});
