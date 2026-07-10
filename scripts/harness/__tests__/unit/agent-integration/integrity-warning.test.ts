// @unit agent-integration
// @layer test
// @story WI-254
// @work-item-id WI-254

import { describe, expect, it } from "vitest";
import {
  buildIntegrityUnverifiableWarning,
  buildIntegrityWarning,
} from "../../../agent-integration/presentation/phasegate-status-context.js";
import { context, target } from "../../helpers/test-helpers.js";

target("buildIntegrityWarning", () => {
  describe("drift なし", () => {
    context("空配列を渡した場合", () => {
      it("null を返す（警告を出さない）", () => {
        // Arrange
        const drifts: [] = [];

        // Act
        const result = buildIntegrityWarning(drifts);

        // Assert
        expect(result).toBeNull();
      });
    });
  });

  describe("drift あり", () => {
    context("mismatch drift を渡した場合", () => {
      it("warn-only の警告ブロックに path と種別を含む", () => {
        // Act
        const result = buildIntegrityWarning([{ path: "skills/a/SKILL.md", kind: "mismatch" }]);

        // Assert
        expect(result).not.toBeNull();
        expect(result).toContain("warn-only");
        expect(result).toContain("MISMATCH");
        expect(result).toContain("skills/a/SKILL.md");
        expect(result).toContain("integrity:pin");
      });
    });

    context("mismatch と missing が混在する場合", () => {
      it("両方の drift を警告に含む", () => {
        // Act
        const result = buildIntegrityWarning([
          { path: "skills/a/SKILL.md", kind: "mismatch" },
          { path: ".husky/pre-commit", kind: "missing" },
        ]);

        // Assert
        expect(result).toContain("MISMATCH");
        expect(result).toContain("MISSING");
      });
    });
  });

  describe("manifest 未導入（manifest-absent のみ）", () => {
    context("manifest-absent drift のみを渡した場合", () => {
      it("null を返す（未導入プロジェクトでは沈黙し警告を出さない）", () => {
        // Arrange
        const drifts = [{ path: "phasegate.integrity.json", kind: "manifest-absent" as const }];

        // Act
        const result = buildIntegrityWarning(drifts);

        // Assert
        expect(result).toBeNull();
      });
    });
  });
});

target("buildIntegrityUnverifiableWarning", () => {
  context("検証不能理由を渡した場合", () => {
    it("fail-open を明示する警告を返す", () => {
      // Act
      const result = buildIntegrityUnverifiableWarning("Error: boom");

      // Assert
      expect(result).toContain("fail-open");
      expect(result).toContain("Error: boom");
    });
  });
});
