// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-353
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PresetDefinitionStore } from "../../../config-foundation/infrastructure/preset-definition-store.js";
import { HarnessConfigQuickModeConfigAdapter } from "../../../quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.js";
import { target } from "../../helpers/test-helpers.js";

/**
 * WI-353: 防御プリセット定義の quickMode.allowedCategories と、
 * Quick Mode 実効経路（HarnessConfigQuickModeConfigAdapter の既定値）の整合を固定する契約テスト。
 *
 * presets/*.json の quickMode は preset 解決経由でしか読まれないが、
 * Quick Mode 判定は raw JSON を読む adapter の既定値で動くため、
 * 両者が乖離すると「宣言と実効値が違う」状態が静かに発生する。
 */
target("防御プリセット定義と Quick Mode 実効既定値の整合", () => {
  let workDirectory: string;
  let effectiveDefaultCategories: readonly string[];

  beforeAll(async () => {
    workDirectory = mkdtempSync(path.join(tmpdir(), "phasegate-preset-quickmode-"));
    const configPath = path.join(workDirectory, "phasegate.config.json");
    // quickMode セクションを持たない config = 実効既定値が使われる経路
    writeFileSync(
      configPath,
      JSON.stringify({ project: { name: "contract", preset: "standard" }, layers: {}, phaseDependencies: {} }),
      "utf8",
    );
    const adapter = new HarnessConfigQuickModeConfigAdapter(configPath);
    const quickModeConfig = await adapter.getQuickModeConfig();
    effectiveDefaultCategories = quickModeConfig.allowedCategories;
  });

  afterAll(() => {
    rmSync(workDirectory, { recursive: true, force: true });
  });

  describe("3つの防御プリセットの allowedCategories が実効既定値と一致する", () => {
    it("実効既定値が bugfix/docs/test/config の4カテゴリであること", () => {
      // Arrange
      const expected = ["bugfix", "docs", "test", "config"];
      // Act
      const actual = effectiveDefaultCategories;
      // Assert
      expect(actual).toEqual(expected);
    });

    it.each([
      ["minimal"],
      ["standard"],
      ["strict"],
    ])("防御プリセット '%s' の quickMode.allowedCategories が実効既定値と一致すること", (presetId) => {
      // Arrange
      const presets = new PresetDefinitionStore().load();
      // Act
      const actual = presets[presetId as "minimal" | "standard" | "strict"].quickMode.allowedCategories;
      // Assert
      expect(actual).toEqual([...effectiveDefaultCategories]);
    });
  });
});
