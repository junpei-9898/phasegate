// @unit ci-governance
// @layer test
// @story WI-254
// @work-item-id WI-254

import { describe, expect, it } from "vitest";
import { IntegrityChecker } from "../../../../ci-governance/domain/services/integrity-checker.js";
import { IntegrityManifest } from "../../../../ci-governance/domain/value-objects/integrity-manifest.js";
import { context, target } from "../../../helpers/test-helpers.js";

const DIGEST = (c: string) => c.repeat(64);

target("IntegrityChecker", () => {
  describe("drift なし", () => {
    context("manifest と actual が完全一致する場合", () => {
      it("drift を返さない", () => {
        // Arrange
        const manifest = IntegrityManifest.create({
          files: new Map([
            ["a.md", DIGEST("a")],
            ["b.md", DIGEST("b")],
          ]),
        });
        const actual = new Map([
          ["a.md", DIGEST("a")],
          ["b.md", DIGEST("b")],
        ]);
        const checker = new IntegrityChecker();

        // Act
        const drifts = checker.computeDrifts(manifest, actual);

        // Assert
        expect(drifts).toEqual([]);
      });
    });
  });

  describe("drift 検出", () => {
    context("digest が不一致の場合", () => {
      it("mismatch を返す", () => {
        // Arrange
        const manifest = IntegrityManifest.create({
          files: new Map([["a.md", DIGEST("a")]]),
        });
        const actual = new Map([["a.md", DIGEST("x")]]);
        const checker = new IntegrityChecker();

        // Act
        const drifts = checker.computeDrifts(manifest, actual);

        // Assert
        expect(drifts).toEqual([{ path: "a.md", kind: "mismatch" }]);
      });
    });

    context("actual に無く manifest にある場合", () => {
      it("missing を返す", () => {
        // Arrange
        const manifest = IntegrityManifest.create({
          files: new Map([["a.md", DIGEST("a")]]),
        });
        const actual = new Map<string, string>();
        const checker = new IntegrityChecker();

        // Act
        const drifts = checker.computeDrifts(manifest, actual);

        // Assert
        expect(drifts).toEqual([{ path: "a.md", kind: "missing" }]);
      });
    });

    context("manifest に無く actual にある場合", () => {
      it("added を返す", () => {
        // Arrange
        const manifest = IntegrityManifest.create({
          files: new Map([["a.md", DIGEST("a")]]),
        });
        const actual = new Map([
          ["a.md", DIGEST("a")],
          ["b.md", DIGEST("b")],
        ]);
        const checker = new IntegrityChecker();

        // Act
        const drifts = checker.computeDrifts(manifest, actual);

        // Assert
        expect(drifts).toEqual([{ path: "b.md", kind: "added" }]);
      });
    });

    context("複数種の drift が混在する場合", () => {
      it("path 昇順で決定的に返す", () => {
        // Arrange
        const manifest = IntegrityManifest.create({
          files: new Map([
            ["keep.md", DIGEST("1")],
            ["gone.md", DIGEST("2")],
            ["diff.md", DIGEST("3")],
          ]),
        });
        const actual = new Map([
          ["keep.md", DIGEST("1")],
          ["diff.md", DIGEST("9")],
          ["new.md", DIGEST("4")],
        ]);
        const checker = new IntegrityChecker();

        // Act
        const drifts = checker.computeDrifts(manifest, actual);

        // Assert
        expect(drifts).toEqual([
          { path: "diff.md", kind: "mismatch" },
          { path: "gone.md", kind: "missing" },
          { path: "new.md", kind: "added" },
        ]);
      });
    });
  });

  describe("manifest 欠落", () => {
    context("manifest が null の場合", () => {
      it("manifest-absent を 1 件返す", () => {
        // Arrange
        const actual = new Map([["a.md", DIGEST("a")]]);
        const checker = new IntegrityChecker();

        // Act
        const drifts = checker.computeDrifts(null, actual);

        // Assert
        expect(drifts).toEqual([{ path: "phasegate.integrity.json", kind: "manifest-absent" }]);
      });
    });
  });
});
