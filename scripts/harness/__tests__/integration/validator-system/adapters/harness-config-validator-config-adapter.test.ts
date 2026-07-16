/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 * @work-item-id WI-156 / WI-301
 */
import { describe, expect, it } from "vitest";
import { HarnessConfigValidatorConfigAdapter } from "../../../../validator-system/infrastructure/adapters/harness-config-validator-config-adapter.js";
import { context, target } from "../../../helpers/test-helpers.js";

target("HarnessConfigValidatorConfigAdapter", () => {
  describe("getLayerConfig", () => {
    context('preset="standard"の設定でL2を取得する場合', () => {
      it("L2設定を取得すると有効なL2バリデータID一覧を返す (IT-REPO-HCAdapter-001)", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: "standard",
          layers: {
            L2: { enabled: true, validators: ["L2-001", "L2-002", "L2-003"] },
            L3: {
              enabled: true,
              validators: ["L3-001", "L3-002", "L3-003", "L3-004"],
              coverageThreshold: 90,
              bundleSizeLimit: 512000,
            },
            L4: { enabled: true, validators: ["L4-001", "L4-002", "L4-003", "L4-004", "L4-005", "L4-006"] },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig("L2");

        // Assert
        expect(actual.layer).toBe("L2");
        expect(actual.enabled).toBe(true);
        expect(actual.validatorIds).toEqual(["L2-001", "L2-002", "L2-003"]);
        expect(actual.strictOnly).toBe(false);
      });
    });

    context('preset="standard"でL3を取得する場合', () => {
      it("L3設定を取得するとカバレッジ閾値を含む設定を返す (IT-REPO-HCAdapter-002)", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: "standard",
          layers: {
            L3: {
              enabled: true,
              validators: ["L3-001", "L3-002", "L3-003", "L3-004"],
              coverageThreshold: 90,
              bundleSizeLimit: 512000,
            },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig("L3");

        // Assert
        expect(actual.layer).toBe("L3");
        expect(actual.thresholds.coverageThreshold).toBe(90);
        expect(actual.strictOnly).toBe(false);
      });
    });

    context('preset="standard"でL4を取得する場合', () => {
      it("L4設定を取得すると有効なL4設定を返す (IT-REPO-HCAdapter-003)", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: "standard",
          layers: {
            L4: {
              enabled: true,
              validators: ["drift-detector", "doc-freshness-checker", "pointer-validator", "skill-catalog-drift"],
            },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig("L4");

        // Assert
        expect(actual.layer).toBe("L4");
        expect(actual.enabled).toBe(true);
        expect(actual.validatorIds).toEqual(["L4-001", "L4-004", "L4-005", "L4-006"]);
      });
    });

    context('preset="strict"の場合', () => {
      it("strictプリセットのL3設定はstrictOnly=trueを返す (IT-REPO-HCAdapter-004)", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: "strict",
          layers: {
            L3: {
              enabled: true,
              validators: ["L3-001", "L3-002", "L3-003", "L3-004"],
              coverageThreshold: 90,
              bundleSizeLimit: 512000,
            },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig("L3");

        // Assert
        expect(actual.strictOnly).toBe(true);
      });
    });

    context('preset="minimal"でL3 enabled=falseの場合', () => {
      it("minimalプリセットでL3が無効な場合はenabled=falseを返す (IT-REPO-HCAdapter-005)", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: "minimal",
          layers: {
            L3: { enabled: false, validators: ["L3-001", "L3-002", "L3-003", "L3-004"] },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig("L3");

        // Assert
        expect(actual.enabled).toBe(false);
      });
    });

    context("bundleSizeLimit=512000が設定されている場合", () => {
      it("L3設定にbundleSizeLimitがある場合は閾値に反映する (IT-REPO-HCAdapter-006)", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: "standard",
          layers: {
            L3: {
              enabled: true,
              validators: ["L3-001", "L3-002", "L3-003", "L3-004"],
              coverageThreshold: 90,
              bundleSizeLimit: 512000,
            },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig("L3");

        // Assert
        expect(actual.thresholds.bundleSizeLimit).toBe(512000);
      });
    });

    context("layersが未定義の場合", () => {
      it("デフォルトのvalidatorIdsが使用される (IT-REPO-HCAdapter-007)", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: "standard",
        });

        // Act
        const actual = await adapter.getLayerConfig("L2");

        // Assert
        expect(actual.validatorIds).toEqual(["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015"]);
        expect(actual.enabled).toBe(true);
      });
    });

    context("World automatic integrationを切り替える場合", () => {
      it("world.enabled=falseではL2-017をvalidator集合から除外すること", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          world: { enabled: false },
          layers: { L2: { enabled: true, validators: ["L2-001", "L2-017"] } },
        });

        // Act
        const actual = await adapter.getLayerConfig("L2");

        // Assert
        expect(actual.validatorIds).toEqual(["L2-001"]);
      });

      it("world.enabled=trueではL2-017をvalidator集合へ一度だけ含めること", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          world: { enabled: true },
          layers: { L2: { enabled: true, validators: ["L2-001", "L2-017", "L2-017"] } },
        });

        // Act
        const actual = await adapter.getLayerConfig("L2");

        // Assert
        expect(actual.validatorIds).toEqual(["L2-001", "L2-017"]);
      });
    });

    context("preset未指定の場合", () => {
      it("standardプリセットが適用される (IT-REPO-HCAdapter-008)", async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({});

        // Act
        const actual = await adapter.getLayerConfig("L2");

        // Assert
        expect(actual.strictOnly).toBe(false);
        expect(actual.enabled).toBe(true);
      });
    });
  });
});
