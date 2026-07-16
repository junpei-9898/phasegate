// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-133
// @work-item-id WI-217
// @work-item-id WI-212
// @work-item-id WI-300 / WI-301
import { describe, expect, it } from "vitest";
import { toValidatorSystemConfig } from "../../../config-foundation/application/mappers/validator-system-config-mapper.js";
import type { HarnessConfigV2 } from "../../../config-foundation/domain/harness-config.js";
import { WORLD_CONFIG_DEFAULTS } from "../../../config-foundation/domain/value-objects/world-config.js";
import { context, target } from "../../helpers/test-helpers.ts";

function createResolvedConfig(): HarnessConfigV2 {
  return {
    project: {
      name: "my-project",
      preset: "standard",
      languages: ["typescript"],
    },
    layers: {
      L1: {
        enabled: true,
        rules: {},
      },
      L2: {
        enabled: true,
        validators: ["phase-gate", "architecture"],
      },
      L3: {
        enabled: true,
        validators: ["consistency"],
        coverageThreshold: 80,
      },
      L4: {
        enabled: false,
        validators: ["drift-detector"],
        schedule: "0 0 * * *",
      },
    },
    quickMode: {
      allowedCategories: ["bugfix"],
      maintainedLayers: ["L1", "L2"],
      relaxedGates: [],
    },
    phaseDependencies: {
      preset: "default",
      override: false,
      customRules: [],
    },
    planningMode: {
      default: "interactive",
      perPhase: {},
    },
    harnesses: {
      agentLessonCollection: false,
      cascadeUpdate: false,
      bundleSizeLimit: 0,
      deadCodeGC: false,
    },
    paths: {
      designDocs: "docs/product/construction",
      inceptionDocs: "docs/inception",
    },
    reporting: {
      format: "json",
      outputDir: "reports",
    },
    validate: {
      failOnWarning: false,
    },
  };
}

target("toValidatorSystemConfig", () => {
  describe("resolved configをvalidator-system用configに変換する場合", () => {
    context("L4が無効でvalidator配列が設定されている場合", () => {
      it("validator配列をvalidator-systemのID語彙に正規化して渡すこと", () => {
        // Arrange
        const resolvedConfig = createResolvedConfig();

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toEqual({
          project: { preset: "standard", languages: ["typescript"] },
          paths: { designDocs: "docs/product/construction", inceptionDocs: "docs/inception" },
          layers: {
            L2: { enabled: true, validators: ["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015", "L2-016"] },
            L3: {
              enabled: true,
              validators: ["L3-001", "L3-002", "L3-003", "L3-004", "L3-006", "L3-007"],
              coverageThreshold: 80,
              acBoundStories: [],
            },
            L4: { enabled: false, validators: ["L4-001"] },
          },
          harnesses: { bundleSizeLimit: 0, deadCodeGC: false },
          architecture: undefined,
          validate: { failOnWarning: false },
        });
      });
    });

    context("validate.failOnWarning が true の場合", () => {
      it("failOnWarning=true が validator-system に伝搬すること", () => {
        // Arrange — WI-094 / ADR-017
        const resolvedConfig = createResolvedConfig();
        resolvedConfig.validate = { failOnWarning: true };

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toEqual({
          project: { preset: "standard", languages: ["typescript"] },
          paths: { designDocs: "docs/product/construction", inceptionDocs: "docs/inception" },
          layers: {
            L2: { enabled: true, validators: ["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015", "L2-016"] },
            L3: {
              enabled: true,
              validators: ["L3-001", "L3-002", "L3-003", "L3-004", "L3-006", "L3-007"],
              coverageThreshold: 80,
              acBoundStories: [],
            },
            L4: { enabled: false, validators: ["L4-001"] },
          },
          harnesses: { bundleSizeLimit: 0, deadCodeGC: false },
          architecture: undefined,
          validate: { failOnWarning: true },
        });
      });
    });

    context("personal document rootを使う場合", () => {
      it("L4-002 consistency-checkをvalidator listへ追加すること", () => {
        // Arrange
        const resolvedConfig = createResolvedConfig();
        resolvedConfig.paths = {
          designDocs: ".phasegate-local/product/construction",
          inceptionDocs: ".phasegate-local/inception",
        };

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toMatchObject({
          layers: {
            L4: {
              validators: ["L4-001", "L4-002"],
            },
          },
        });
      });
    });

    context("L3.requirementMatrixPath が設定されている場合", () => {
      it("L3-004 用の matrix パスを validator-system config へ伝搬すること", () => {
        // Arrange
        const resolvedConfig = createResolvedConfig();
        resolvedConfig.layers.L3.requirementMatrixPath = "config/custom-matrix.json";

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toMatchObject({
          layers: {
            L3: {
              requirementMatrixPath: "config/custom-matrix.json",
            },
          },
        });
      });
    });

    context('L3.validators に alias "ac-bound-coverage" が含まれる場合（H16-03）', () => {
      it("L3-005 へ正規化されること", () => {
        // Arrange
        const resolvedConfig = createResolvedConfig();
        resolvedConfig.layers.L3.validators = ["security", "ac-bound-coverage"];

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        const l3 = (actual as { layers: { L3: { validators: string[] } } }).layers.L3;
        expect(l3.validators).toContain("L3-005");
        expect(l3.validators).toContain("L3-001");
      });
    });

    context("L3.acBoundStories が設定されている場合（H16-03）", () => {
      it("acBoundStories を validator-system config へ伝搬すること", () => {
        // Arrange
        const resolvedConfig = createResolvedConfig();
        resolvedConfig.layers.L3.acBoundStories = ["HF2-05"];

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toMatchObject({
          layers: {
            L3: {
              acBoundStories: ["HF2-05"],
            },
          },
        });
      });
    });

    context("resolved configが取得できない場合", () => {
      it("validator-systemのデフォルト設定に委ねるためundefinedを返すこと", () => {
        // Arrange
        const resolvedConfig = undefined;

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toEqual(undefined);
      });
    });

    context("resolved World configがある場合", () => {
      it("disabled World DTOを伝搬しL2-017を追加しないこと", () => {
        // Arrange
        const resolvedConfig = createResolvedConfig();
        resolvedConfig.world = structuredClone(WORLD_CONFIG_DEFAULTS);

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig) as {
          readonly world: unknown;
          readonly layers: {
            readonly L2: { readonly validators: readonly string[] };
            readonly L3: { readonly validators: readonly string[] };
          };
        };

        // Assert
        expect(actual.world).toEqual(WORLD_CONFIG_DEFAULTS);
        expect(actual.layers.L2.validators).not.toContain("L2-017");
        expect(actual.layers.L3.validators).not.toContain("L3-008");
      });

      it("world.enabled=trueではL2-017だけをautomatic validatorへ追加すること", () => {
        // Arrange
        const resolvedConfig = createResolvedConfig();
        resolvedConfig.world = { ...structuredClone(WORLD_CONFIG_DEFAULTS), enabled: true };

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig) as {
          readonly layers: {
            readonly L2: { readonly validators: readonly string[] };
            readonly L3: { readonly validators: readonly string[] };
          };
        };

        // Assert
        expect(actual.layers.L2.validators.filter((id) => id === "L2-017")).toHaveLength(1);
        expect(actual.layers.L3.validators).not.toContain("L3-008");
      });
    });
  });
});
