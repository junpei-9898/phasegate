// @layer test
// @unit quick-mode
// @story H10-02
// @work-item-id WI-377

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  HarnessConfigNotFoundError,
  HarnessConfigParseError,
  HarnessConfigQuickModeConfigAdapter,
} from "../../../quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

/**
 * ADR-040: Quick Mode の実効設定を防御プリセット解決経由で決定する。
 *
 * 経路の載せ替えは既存プロジェクトの実効挙動を変えないことが絶対条件のため、
 * 「防御プリセット × quickMode キー有無 × 明示 override 有無」のマトリクスで
 * 実効値を固定する。本テストは載せ替え前の実装（raw JSON 直読み）でも
 * 載せ替え後の実装（preset 解決経由）でも同じ期待値で緑になる。
 */

const PRESET_IDS = ["minimal", "standard", "strict"] as const;

/** docs/guide/configuration.md が既定として記載している Quick Mode 実効値 */
const EFFECTIVE_DEFAULTS = {
  allowedCategories: ["bugfix", "docs", "test", "config"],
  maintainedLayers: ["L1", "L2-002", "L2-003", "L2-014", "L3-001"],
  relaxedGates: ["L2-001", "L3-002", "L3-003", "L3-004", "L4"],
} as const;

let workDirectory: string;
let configSequence = 0;

function writeConfig(document: Record<string, unknown>): string {
  configSequence += 1;
  const configPath = path.join(workDirectory, `phasegate.config.${configSequence}.json`);
  writeFileSync(configPath, JSON.stringify(document), "utf8");
  return configPath;
}

function baseDocument(presetId: string, quickMode?: unknown): Record<string, unknown> {
  const document: Record<string, unknown> = {
    project: { name: "wi377", preset: presetId },
    layers: {},
    phaseDependencies: { preset: "default", override: false, customRules: [] },
  };
  if (quickMode !== undefined) {
    document["quickMode"] = quickMode;
  }
  return document;
}

beforeAll(() => {
  workDirectory = mkdtempSync(path.join(tmpdir(), "phasegate-wi377-"));
});

afterAll(() => {
  rmSync(workDirectory, { recursive: true, force: true });
});

target("Quick Mode 設定の防御プリセット解決 (WI-377 / ADR-040)", () => {
  describe("防御プリセット × quickMode キー有無 × 明示 override 有無のマトリクス", () => {
    context("quickMode セクションが無い場合", () => {
      it.each(PRESET_IDS)("防御プリセット '%s' で実効既定値になること", async (presetId) => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(writeConfig(baseDocument(presetId)));

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect({
          allowedCategories: actual.allowedCategories,
          maintainedLayers: actual.maintainedLayers,
          relaxedGates: actual.relaxedGates,
        }).toEqual({
          allowedCategories: [...EFFECTIVE_DEFAULTS.allowedCategories],
          maintainedLayers: [...EFFECTIVE_DEFAULTS.maintainedLayers],
          relaxedGates: [...EFFECTIVE_DEFAULTS.relaxedGates],
        });
      });
    });

    context("quickMode セクションが空オブジェクトの場合", () => {
      it.each(PRESET_IDS)("防御プリセット '%s' で実効既定値になること", async (presetId) => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(writeConfig(baseDocument(presetId, {})));

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect({
          allowedCategories: actual.allowedCategories,
          maintainedLayers: actual.maintainedLayers,
          relaxedGates: actual.relaxedGates,
        }).toEqual({
          allowedCategories: [...EFFECTIVE_DEFAULTS.allowedCategories],
          maintainedLayers: [...EFFECTIVE_DEFAULTS.maintainedLayers],
          relaxedGates: [...EFFECTIVE_DEFAULTS.relaxedGates],
        });
      });
    });

    context("quickMode の一部キーだけを明示している場合", () => {
      it.each(
        PRESET_IDS,
      )("防御プリセット '%s' で明示キーは override 値・未宣言キーは実効既定値になること", async (presetId) => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(
          writeConfig(baseDocument(presetId, { allowedCategories: ["bugfix"] })),
        );

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect({
          allowedCategories: actual.allowedCategories,
          maintainedLayers: actual.maintainedLayers,
          relaxedGates: actual.relaxedGates,
        }).toEqual({
          allowedCategories: ["bugfix"],
          maintainedLayers: [...EFFECTIVE_DEFAULTS.maintainedLayers],
          relaxedGates: [...EFFECTIVE_DEFAULTS.relaxedGates],
        });
      });
    });

    context("quickMode の全キーを明示している場合", () => {
      it.each(PRESET_IDS)("防御プリセット '%s' で明示値がそのまま使われること", async (presetId) => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(
          writeConfig(
            baseDocument(presetId, {
              allowedCategories: ["docs"],
              maintainedLayers: ["L1", "L2"],
              relaxedGates: ["phase-gate", "2-phase-execution"],
            }),
          ),
        );

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect({
          allowedCategories: actual.allowedCategories,
          maintainedLayers: actual.maintainedLayers,
          relaxedGates: actual.relaxedGates,
        }).toEqual({
          allowedCategories: ["docs"],
          maintainedLayers: ["L1", "L2"],
          relaxedGates: ["phase-gate", "2-phase-execution"],
        });
      });
    });
  });

  describe("fullModeRequiredWhen の解決", () => {
    context("未宣言の場合", () => {
      it("3ルールすべてが true になること", async () => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(
          writeConfig(baseDocument("standard", { allowedCategories: ["bugfix"] })),
        );

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect(actual.fullModeRequiredWhen).toEqual({
          mixedCategories: true,
          newDomainFile: true,
          apiContractChange: true,
        });
      });
    });

    context("部分的に明示している場合", () => {
      it("明示値が保持され未指定は true で補完されること", async () => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(
          writeConfig(
            baseDocument("strict", {
              allowedCategories: ["bugfix"],
              fullModeRequiredWhen: { mixedCategories: false },
            }),
          ),
        );

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect(actual.fullModeRequiredWhen).toEqual({
          mixedCategories: false,
          newDomainFile: true,
          apiContractChange: true,
        });
      });
    });
  });

  describe("preset 解決不能時の fail-open", () => {
    context("未知の防御プリセットが宣言されている場合", () => {
      it("実効既定値で動作すること", async () => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(writeConfig(baseDocument("unknown-preset")));

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect(actual.allowedCategories).toEqual([...EFFECTIVE_DEFAULTS.allowedCategories]);
        expect(actual.maintainedLayers).toEqual([...EFFECTIVE_DEFAULTS.maintainedLayers]);
        expect(actual.relaxedGates).toEqual([...EFFECTIVE_DEFAULTS.relaxedGates]);
      });
    });

    context("project セクションが欠落している場合", () => {
      it("実効既定値で動作すること", async () => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(writeConfig({ layers: {} }));

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect(actual.allowedCategories).toEqual([...EFFECTIVE_DEFAULTS.allowedCategories]);
        expect(actual.maintainedLayers).toEqual([...EFFECTIVE_DEFAULTS.maintainedLayers]);
        expect(actual.relaxedGates).toEqual([...EFFECTIVE_DEFAULTS.relaxedGates]);
      });
    });

    context("project セクションが欠落しかつ quickMode が明示されている場合", () => {
      it("明示値が使われ未宣言キーは実効既定値になること", async () => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(
          writeConfig({ layers: {}, quickMode: { allowedCategories: ["test"] } }),
        );

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect(actual.allowedCategories).toEqual(["test"]);
        expect(actual.maintainedLayers).toEqual([...EFFECTIVE_DEFAULTS.maintainedLayers]);
        expect(actual.relaxedGates).toEqual([...EFFECTIVE_DEFAULTS.relaxedGates]);
      });
    });
  });

  describe("エラー契約", () => {
    context("config ファイルが存在しない場合", () => {
      it("HarnessConfigNotFoundError が投げられること", async () => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(path.join(workDirectory, "absent.json"));

        // Act & Assert
        await expect(adapter.getQuickModeConfig()).rejects.toBeInstanceOf(HarnessConfigNotFoundError);
      });
    });

    context("config が不正な JSON の場合", () => {
      it("HarnessConfigParseError が投げられること", async () => {
        // Arrange
        const configPath = path.join(workDirectory, "broken.json");
        writeFileSync(configPath, "{ invalid", "utf8");
        const adapter = new HarnessConfigQuickModeConfigAdapter(configPath);

        // Act & Assert
        await expect(adapter.getQuickModeConfig()).rejects.toBeInstanceOf(HarnessConfigParseError);
      });
    });

    context("allowedCategories が空配列の場合", () => {
      it("QuickModeConfigError が投げられること", async () => {
        // Arrange
        const adapter = new HarnessConfigQuickModeConfigAdapter(
          writeConfig(baseDocument("standard", { allowedCategories: [] })),
        );

        // Act & Assert
        await expect(adapter.getQuickModeConfig()).rejects.toThrow("allowedCategories must not be empty");
      });
    });
  });
});
