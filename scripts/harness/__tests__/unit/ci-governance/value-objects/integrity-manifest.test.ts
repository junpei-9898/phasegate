// @unit ci-governance
// @layer test
// @story WI-254
// @work-item-id WI-254

import { describe, expect, it } from "vitest";
import { IntegrityManifest } from "../../../../ci-governance/domain/value-objects/integrity-manifest.js";
import { context, target } from "../../../helpers/test-helpers.js";

const DIGEST = (c: string) => c.repeat(64);

target("IntegrityManifest", () => {
  describe("正常系", () => {
    context("有効な files マップを渡した場合", () => {
      it("version=1 / algorithm=sha256 で生成される", () => {
        // Arrange
        const files = new Map([["skills/a/SKILL.md", DIGEST("a")]]);

        // Act
        const manifest = IntegrityManifest.create({ files });

        // Assert
        expect(manifest.version).toBe(1);
        expect(manifest.algorithm).toBe("sha256");
        expect(manifest.digestOf("skills/a/SKILL.md")).toBe(DIGEST("a"));
      });
    });

    context("複数エントリを渡した場合", () => {
      it("sortedEntries が path 昇順で返る", () => {
        // Arrange
        const files = new Map([
          ["z.md", DIGEST("a")],
          ["a.md", DIGEST("b")],
          ["m.md", DIGEST("c")],
        ]);

        // Act
        const manifest = IntegrityManifest.create({ files });
        const paths = manifest.sortedEntries().map(([p]) => p);

        // Assert
        expect(paths).toEqual(["a.md", "m.md", "z.md"]);
      });
    });

    context("paths を要求した場合", () => {
      it("昇順の path 一覧を返す", () => {
        // Arrange
        const files = new Map([
          ["b.md", DIGEST("a")],
          ["a.md", DIGEST("b")],
        ]);

        // Act
        const manifest = IntegrityManifest.create({ files });

        // Assert
        expect(manifest.paths()).toEqual(["a.md", "b.md"]);
      });
    });
  });

  describe("不変条件違反", () => {
    context("digest が 64 桁 hex でない場合", () => {
      it("例外を投げる", () => {
        // Arrange
        const files = new Map([["a.md", "not-a-valid-digest"]]);

        // Act & Assert
        expect(() => IntegrityManifest.create({ files })).toThrow();
      });
    });

    context("path が空文字の場合", () => {
      it("例外を投げる", () => {
        // Arrange
        const files = new Map([["", DIGEST("a")]]);

        // Act & Assert
        expect(() => IntegrityManifest.create({ files })).toThrow();
      });
    });
  });
});
