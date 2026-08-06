// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-353
// @work-item-id WI-378
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PresetDefinitionStore } from "../../../config-foundation/infrastructure/preset-definition-store.js";
import { HarnessConfigQuickModeConfigAdapter } from "../../../quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.js";
import { target } from "../../helpers/test-helpers.js";

/**
 * WI-353 は「presets/*.json の quickMode 宣言」と「adapter のハードコード既定値」という
 * 二重管理の整合を検査していた（宣言はどこからも読まれないデッド宣言だった）。
 *
 * WI-377 / ADR-040 で adapter が防御プリセット解決を経由するようになったため、
 * 本テストは「preset 宣言が実際に読まれ、Quick Mode の実効値になっている」ことの検証に昇格する。
 * quickMode セクションを持たない config に対する adapter の実効値が、
 * 当該防御プリセットの quickMode 宣言そのものと 3 キーとも一致することを固定する。
 */

const PRESET_IDS = ["minimal", "standard", "strict"] as const;

/** docs/guide/configuration.md が既定として記載している Quick Mode 実効値 */
const DOCUMENTED_DEFAULTS = {
  allowedCategories: ["bugfix", "docs", "test", "config"],
  maintainedLayers: ["L1", "L2-002", "L2-003", "L2-014", "L3-001"],
  relaxedGates: ["L2-001", "L3-002", "L3-003", "L3-004", "L4"],
} as const;

target("防御プリセットの quickMode 宣言が Quick Mode 実効値になること", () => {
  let workDirectory: string;
  const effectiveByPreset = new Map<
    string,
    { allowedCategories: readonly string[]; maintainedLayers: readonly string[]; relaxedGates: readonly string[] }
  >();

  beforeAll(async () => {
    workDirectory = mkdtempSync(path.join(tmpdir(), "phasegate-preset-quickmode-"));
    for (const presetId of PRESET_IDS) {
      const configPath = path.join(workDirectory, `phasegate.config.${presetId}.json`);
      // quickMode セクションを持たない config = preset 宣言がそのまま実効値になる経路
      writeFileSync(
        configPath,
        JSON.stringify({ project: { name: "contract", preset: presetId }, layers: {}, phaseDependencies: {} }),
        "utf8",
      );
      const quickModeConfig = await new HarnessConfigQuickModeConfigAdapter(configPath).getQuickModeConfig();
      effectiveByPreset.set(presetId, {
        allowedCategories: quickModeConfig.allowedCategories,
        maintainedLayers: quickModeConfig.maintainedLayers,
        relaxedGates: quickModeConfig.relaxedGates,
      });
    }
  });

  afterAll(() => {
    rmSync(workDirectory, { recursive: true, force: true });
  });

  describe("preset 宣言と実効値の一致（デッド宣言の解消）", () => {
    it.each(PRESET_IDS)("宣言された 3 キーが防御プリセット '%s' の実効値と一致すること", (presetId) => {
      // Arrange
      const declared = new PresetDefinitionStore().load()[presetId].quickMode;

      // Act
      const actual = effectiveByPreset.get(presetId);

      // Assert
      expect(actual).toEqual({
        allowedCategories: declared.allowedCategories,
        maintainedLayers: declared.maintainedLayers,
        relaxedGates: declared.relaxedGates,
      });
    });
  });

  describe("実効値とドキュメント記載の既定値の一致", () => {
    it.each(PRESET_IDS)("docs/guide 記載の既定値が防御プリセット '%s' の実効値と一致すること", (presetId) => {
      // Arrange
      const expected = {
        allowedCategories: [...DOCUMENTED_DEFAULTS.allowedCategories],
        maintainedLayers: [...DOCUMENTED_DEFAULTS.maintainedLayers],
        relaxedGates: [...DOCUMENTED_DEFAULTS.relaxedGates],
      };

      // Act
      const actual = effectiveByPreset.get(presetId);

      // Assert
      expect(actual).toEqual(expected);
    });
  });
});
