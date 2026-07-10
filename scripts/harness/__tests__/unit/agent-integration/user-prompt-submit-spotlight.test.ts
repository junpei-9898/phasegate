// @unit agent-integration
// @layer test
// @story WI-257
// @work-item-id WI-257

import { describe, expect, it } from "vitest";
import {
  buildUserPromptSubmitContext,
  type PhasegateStatus,
  type RecentViolation,
} from "../../../agent-integration/presentation/phasegate-status-context.js";
import { SPOTLIGHT_BEGIN_FENCE, SPOTLIGHT_END_FENCE } from "../../../agent-integration/presentation/spotlight.js";
import { context, target } from "../../helpers/test-helpers.js";

const baseStatus: PhasegateStatus = {
  configFound: true,
  protectedPatterns: ["biome.json"],
  blockedUnits: [],
};

target("buildUserPromptSubmitContext spotlighting", () => {
  describe("working tree 違反あり", () => {
    context("violation の detail がリポジトリ由来の自由文字列である場合", () => {
      it("detail をデータ境界フェンスで包んで出力する", () => {
        // Arrange
        const violations: RecentViolation[] = [
          { type: "protected_file", filePath: "biome.json", detail: "matched pattern `biome.json`" },
        ];

        // Act
        const result = buildUserPromptSubmitContext(baseStatus, violations);

        // Assert
        expect(result).toContain(SPOTLIGHT_BEGIN_FENCE);
        expect(result).toContain(SPOTLIGHT_END_FENCE);
        expect(result).toContain("matched pattern `biome.json`");
        // 構造行（LABEL / filePath）は従来どおりフェンス外に残す
        expect(result).toContain("[PROTECTED FILE]");
        expect(result).toContain("`biome.json`");
      });
    });
  });

  describe("working tree 違反なし", () => {
    context("violations が空の場合", () => {
      it("データ境界フェンスを出力しない（過剰包装しない）", () => {
        // Act
        const result = buildUserPromptSubmitContext(baseStatus, []);

        // Assert
        expect(result).not.toContain(SPOTLIGHT_BEGIN_FENCE);
        expect(result).not.toContain(SPOTLIGHT_END_FENCE);
      });
    });
  });
});
