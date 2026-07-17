// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-327

// WI-327: 手書きの最小 config（project のみ）が schema validate を通過し、
// 省略された全セクションが防御プリセットのデフォルト値で補完されることを固定する。
// schema の required 緩和（v2/v3 とも ["project"]）とプリセット解決の deepMerge 補完が
// セットで機能して初めて成立する契約なので、実物の AjvConfigSchemaValidator と
// PresetDefinitionStore を通した経路で検証する。

import { describe, expect, it } from "vitest";
import { LoadResolvedConfigUseCase } from "../../../config-foundation/application/usecases/load-resolved-config-use-case.js";
import type { PresetId } from "../../../config-foundation/domain/harness-config.js";
import type { ConfigRepositoryPort } from "../../../config-foundation/domain/ports/config-repository-port.js";
import { PresetResolutionService } from "../../../config-foundation/domain/services/preset-resolution-service.js";
import { PresetDefinitionStore } from "../../../config-foundation/infrastructure/preset-definition-store.js";
import { AjvConfigSchemaValidator } from "../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js";
import { context, target } from "../../helpers/test-helpers.js";

class InMemoryConfigRepository implements ConfigRepositoryPort {
  constructor(private readonly document: unknown) {}

  load(): Promise<{ path: string; document: unknown }> {
    return Promise.resolve({ path: "phasegate.config.json", document: this.document });
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

function createUseCase(document: unknown): LoadResolvedConfigUseCase {
  return new LoadResolvedConfigUseCase({
    configRepository: new InMemoryConfigRepository(document),
    schemaValidator: new AjvConfigSchemaValidator(),
    presetDefinitions: new PresetDefinitionStore().load(),
    presetResolutionService: new PresetResolutionService(),
  });
}

target("最小 config のプリセット補完 (WI-327)", () => {
  describe("project のみの最小 config を解決した場合", () => {
    context("standard プリセットの場合", () => {
      it("WI-327: 最小 config の解決結果が standard プリセット定義のデフォルト値と一致すること", async () => {
        // Arrange
        const presetDefinition = new PresetDefinitionStore().load().standard;
        const sut = createUseCase({ project: { name: "myapp", preset: "standard" } });

        // Act
        const actual = await sut.execute();

        // Assert — 省略した全セクションがプリセット定義そのままで補完される
        expect(actual.config.layers).toEqual(presetDefinition.layers);
        expect(actual.config.quickMode).toEqual(presetDefinition.quickMode);
        expect(actual.config.phaseDependencies).toEqual(presetDefinition.phaseDependencies);
        expect(actual.config.planningMode).toEqual(presetDefinition.planningMode);
        expect(actual.config.harnesses).toEqual(presetDefinition.harnesses);
        expect(actual.config.paths).toEqual(presetDefinition.paths);
        expect(actual.config.reporting).toEqual(presetDefinition.reporting);
        expect(actual.config.validate).toEqual(presetDefinition.validate);
        expect(actual.config.preCommit).toEqual(presetDefinition.preCommit);
        expect(actual.config.world).toEqual(presetDefinition.world);
      });

      it("WI-327: 最小 config の解決結果で project が書かれたまま保持され languages が注入されないこと", async () => {
        // Arrange
        const sut = createUseCase({ project: { name: "myapp", preset: "standard" } });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.config.project).toEqual({ name: "myapp", preset: "standard" });
        expect(actual.schemaVersion).toBe("v2");
      });
    });

    context("minimal / strict プリセットの場合", () => {
      it.each<PresetId>([
        "minimal",
        "strict",
      ])("WI-327: 最小 config が %s プリセットでもデフォルト補完で解決できること", async (presetId) => {
        // Arrange
        const presetDefinition = new PresetDefinitionStore().load()[presetId];
        const sut = createUseCase({ project: { name: "myapp", preset: presetId } });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.config.layers).toEqual(presetDefinition.layers);
        expect(actual.config.paths).toEqual(presetDefinition.paths);
        expect(actual.config.reporting).toEqual(presetDefinition.reporting);
      });
    });
  });

  describe("最小 config に不正なセクションを書き足した場合（検証は弱まらない）", () => {
    context("reporting.format が数値の場合", () => {
      it("WI-327: 最小構成緩和後も書かれた不正キーは ConfigValidationError で拒否されること", async () => {
        // Arrange
        const sut = createUseCase({
          project: { name: "myapp", preset: "standard" },
          reporting: { format: 123 },
        });

        // Act
        const actual = await sut.execute().catch((error: unknown) => error);

        // Assert
        expect(actual).toBeInstanceOf(Error);
        expect((actual as Error).message).toContain("L1-001");
      });
    });
  });
});
