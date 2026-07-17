/**
 * @layer test
 * @unit validator-system
 * @work-item-id WI-322
 *
 * WI-322 (github#37 残課題): config なし環境で使われるハードコード fallback（DEFAULT_CONFIG）が
 * カバレッジゲートを強制しない（coverageThreshold: 0 = opt-out → L3-003 が透過 SKIP になる）
 * ことを固定する回帰テスト。WI-317 で定義した「カバレッジゲートはオプトイン」思想との整合を守る。
 */
import { expect, it } from "vitest";
import { createValidatorSystemModule } from "../../../validator-system/composition-root.js";
import { context, target } from "../../helpers/test-helpers.js";

target("createValidatorSystemModule DEFAULT_CONFIG fallback", () => {
  context("config を渡さず DEFAULT_CONFIG fallback で L3-003 のみを実行する場合", () => {
    it("WI-322: config なし fallback ではカバレッジゲートが opt-out され L3-003 が透過 SKIP になる", async () => {
      // Arrange — config 未指定 → composition-root の DEFAULT_CONFIG が適用される
      const mod = createValidatorSystemModule();

      // Act
      const actual = await mod.runL3ValidatorsUseCase.execute({
        validatorIds: ["L3-003"],
        targetPaths: [],
      });

      // Assert — DEFAULT_CONFIG は coverageThreshold: 0（opt-in 思想）なので
      // getCoverage() には到達せず、L3-003 は opt-out 理由付きの SKIP になる
      // （90 が残っているとカバレッジレポート不在環境で fail-closed FAIL になり退行が検出される）
      expect(actual).toHaveLength(1);
      expect(actual[0].validatorId).toBe("L3-003");
      expect(actual[0].skipped).toBe(true);
      expect(actual[0].skipReason).toContain("opt-out");
      expect(actual[0].errors).toEqual([]);
    });
  });
});
