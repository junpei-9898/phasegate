// @unit attestation
// @layer test
// @story H16-03

import { describe, expect, it } from "vitest";
import { AcBoundScopeService } from "../../../../../attestation/domain/services/ac-bound-scope-service.js";
import { context, target } from "../../../../helpers/test-helpers.js";

/** HF2-05 全 AC ac-bound / H99-99 file-fallback を含む matrix */
function matrix(): unknown {
  return {
    stories: [
      {
        storyId: "HF2-05",
        storyMappings: [
          { acId: "AC-1", testReferences: [{ binding: "ac" }] },
          { acId: "AC-2", testReferences: [{ binding: "ac" }, { binding: "file" }] },
        ],
      },
      {
        storyId: "H10-01",
        storyMappings: [
          { acId: "AC-1", testReferences: [{ binding: "ac" }] },
        ],
      },
      {
        storyId: "H99-99",
        storyMappings: [
          { acId: "AC-1", testReferences: [{ binding: "file" }] },
        ],
      },
    ],
  };
}

target("AcBoundScopeService", () => {
  describe("derive", () => {
    context("allowlist 内かつ全 AC が ac-bound な story のみを対象とする場合", () => {
      it("該当 story を昇順で返すこと", () => {
        // Arrange
        const service = new AcBoundScopeService();
        // Act
        const actual = service.derive(matrix(), ["H10-01", "HF2-05"]);
        // Assert
        expect(actual).toEqual(["H10-01", "HF2-05"]);
      });
    });

    context("allowlist 内だが fileFallbackOnly な AC を含む story の場合", () => {
      it("その story を除外すること", () => {
        // Arrange
        const service = new AcBoundScopeService();
        // Act — H99-99 は allowlist 内だが file-fallback のみ
        const actual = service.derive(matrix(), ["HF2-05", "H99-99"]);
        // Assert
        expect(actual).toEqual(["HF2-05"]);
      });
    });

    context("allowlist 外の story が全 AC ac-bound な場合", () => {
      it("allowlist 外は無視すること", () => {
        // Arrange
        const service = new AcBoundScopeService();
        // Act — H10-01 は ac-bound だが allowlist に含めない
        const actual = service.derive(matrix(), ["HF2-05"]);
        // Assert
        expect(actual).toEqual(["HF2-05"]);
      });
    });

    context("複数の該当 story を順不同の allowlist で渡す場合", () => {
      it("返り値は昇順ソートされること", () => {
        // Arrange
        const service = new AcBoundScopeService();
        // Act
        const actual = service.derive(matrix(), ["HF2-05", "H10-01"]);
        // Assert
        expect(actual).toEqual(["H10-01", "HF2-05"]);
      });
    });
  });
});
