// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-300
import { describe, expect, it } from "vitest";
import { ConfigValidationError } from "../../../config-foundation/domain/errors/config-validation-error.js";
import { InvalidHarnessesConfigError } from "../../../config-foundation/domain/errors/invalid-harnesses-config-error.js";
import { UnsupportedFeatureError } from "../../../config-foundation/domain/errors/unsupported-feature-error.js";
import {
  type DomainEvent,
  HarnessConfig,
  type HarnessConfigResolvedDocument,
  type HarnessConfigSourceDocument,
  type LayerId,
  UnknownLayerError,
} from "../../../config-foundation/domain/harness-config.js";
import { FeatureName } from "../../../config-foundation/domain/value-objects/feature-name.js";
import { WORLD_CONFIG_DEFAULTS } from "../../../config-foundation/domain/value-objects/world-config.js";
import { context, target } from "../../helpers/test-helpers.ts";

const AVAILABLE_FEATURES = ["agentLessonCollection", "cascadeUpdate", "bundleSizeLimit", "deadCodeGC"] as const;

function createFeatureName(name: string): FeatureName {
  return FeatureName.create(name, AVAILABLE_FEATURES);
}

function createMinimalFixture(): {
  sourceDocument: HarnessConfigSourceDocument;
  resolvedDocument: HarnessConfigResolvedDocument;
} {
  return {
    sourceDocument: {
      project: {
        name: "my-project",
        preset: "minimal",
      },
      layers: {},
      quickMode: {},
      phaseDependencies: {
        preset: "default",
        override: false,
        customRules: [],
      },
      planningMode: {
        default: "interactive",
        perPhase: {},
      },
      harnesses: {},
      paths: {
        designDocs: "docs/product/construction",
        inceptionDocs: "docs/inception",
      },
      reporting: {
        format: "json",
        outputDir: "reports",
      },
    },
    resolvedDocument: {
      project: {
        name: "my-project",
        preset: "minimal",
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
          enabled: false,
          validators: ["consistency"],
          coverageThreshold: 0,
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
      world: structuredClone(WORLD_CONFIG_DEFAULTS),
    },
  };
}

function createStandardFixture(): {
  sourceDocument: HarnessConfigSourceDocument;
  resolvedDocument: HarnessConfigResolvedDocument;
} {
  const fixture = createMinimalFixture();

  fixture.sourceDocument.project.preset = "standard";
  fixture.resolvedDocument.project.preset = "standard";
  fixture.resolvedDocument.layers.L3 = {
    enabled: true,
    validators: ["consistency", "test-quality"],
    coverageThreshold: 90,
  };

  return fixture;
}

function createStrictFixture(): {
  sourceDocument: HarnessConfigSourceDocument;
  resolvedDocument: HarnessConfigResolvedDocument;
} {
  const fixture = createMinimalFixture();

  fixture.sourceDocument.project.preset = "strict";
  fixture.resolvedDocument.project.preset = "strict";
  fixture.resolvedDocument.layers.L3 = {
    enabled: true,
    validators: ["consistency", "test-quality"],
    coverageThreshold: 95,
  };
  fixture.resolvedDocument.layers.L4 = {
    enabled: true,
    validators: ["drift-detector", "dead-code-detector"],
    schedule: "0 1 * * *",
  };
  fixture.resolvedDocument.harnesses = {
    agentLessonCollection: true,
    cascadeUpdate: false,
    bundleSizeLimit: 500,
    deadCodeGC: true,
  };

  return fixture;
}

function reconstituteHarnessConfig(
  fixture: {
    sourceDocument: HarnessConfigSourceDocument;
    resolvedDocument: HarnessConfigResolvedDocument;
  },
  pendingEvents?: readonly DomainEvent[],
): HarnessConfig {
  return HarnessConfig.reconstitute({
    sourceDocument: fixture.sourceDocument,
    resolvedDocument: fixture.resolvedDocument,
    pendingEvents,
  });
}

function createUnknownFeatureName(): FeatureName {
  return {
    value: "unknownFeature",
    toString(): string {
      return "unknownFeature";
    },
    equals(): boolean {
      return false;
    },
  } as unknown as FeatureName;
}

function createPendingEvent(): DomainEvent {
  return Object.freeze({
    type: "FeatureToggled",
    occurredAt: new Date("2026-03-14T00:00:00.000Z"),
    projectName: "my-project",
    featureName: "agentLessonCollection",
    previousState: false,
    currentState: true,
  });
}

target("HarnessConfig", () => {
  describe("再構築する", () => {
    // UT-CF-001
    context("sourceDocumentとresolvedDocumentのpreset値が不一致の場合", () => {
      it("再構築に失敗する", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.resolvedDocument.project.preset = "strict";

        // Act
        const actual = () => reconstituteHarnessConfig(fixture);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
        expect(actual).toThrowError(/L1-001/);
      });
    });

    // UT-CF-002
    context("resolvedDocumentのbundleSizeLimitが負値の場合", () => {
      it("再構築に失敗する", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.resolvedDocument.harnesses.bundleSizeLimit = -1;

        // Act
        const actual = () => reconstituteHarnessConfig(fixture);

        // Assert
        expect(actual).toThrowError(InvalidHarnessesConfigError);
        expect(actual).toThrowError(/L1-003/);
      });
    });

    // UT-CF-003
    context("phaseDependenciesに意味論上の不正依存が含まれる場合", () => {
      it("構造検証だけで再構築できる", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.sourceDocument.phaseDependencies.customRules = [{ phase: "implement", requires: ["deploy"] }];
        fixture.resolvedDocument.phaseDependencies.customRules = [{ phase: "implement", requires: ["deploy"] }];

        // Act
        const actual = reconstituteHarnessConfig(fixture);

        // Assert
        expect(actual.toResolvedConfig().phaseDependencies.customRules).toEqual([
          { phase: "implement", requires: ["deploy"] },
        ]);
      });
    });

    // UT-CF-004
    context("planningMode.perPhaseに実在しないフェーズ名がある場合", () => {
      it("構造検証だけで再構築できる", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.sourceDocument.planningMode.perPhase = {
          unknownPhase: "embedded-qa",
        };
        fixture.resolvedDocument.planningMode.perPhase = {
          unknownPhase: "embedded-qa",
        };

        // Act
        const actual = reconstituteHarnessConfig(fixture);

        // Assert
        expect(actual.toResolvedConfig().planningMode.perPhase.unknownPhase).toBe("embedded-qa");
      });
    });

    // UT-CF-005
    context("再構築した集約で機能を有効化する / 存在しない機能名を指定した場合", () => {
      it("エラーになる", () => {
        // Arrange
        const fixture = createMinimalFixture();
        const harnessConfig = reconstituteHarnessConfig(fixture);
        const featureName = createUnknownFeatureName();

        // Act
        const actual = () => harnessConfig.enableFeature(featureName);

        // Assert
        expect(actual).toThrowError(UnsupportedFeatureError);
        expect(actual).toThrowError(/L1-004/);
      });
    });

    // UT-CF-006
    context("再構築した集約で機能を無効化する / 存在しない機能名を指定した場合", () => {
      it("エラーになる", () => {
        // Arrange
        const fixture = createMinimalFixture();
        const harnessConfig = reconstituteHarnessConfig(fixture);
        const featureName = createUnknownFeatureName();

        // Act
        const actual = () => harnessConfig.disableFeature(featureName);

        // Assert
        expect(actual).toThrowError(UnsupportedFeatureError);
        expect(actual).toThrowError(/L1-004/);
      });
    });

    // UT-CF-008
    context("standard fixtureを渡した場合", () => {
      it("standardの設定を保持した集約を返す", () => {
        // Arrange
        const fixture = createStandardFixture();

        // Act
        const actual = reconstituteHarnessConfig(fixture);

        // Assert
        expect(actual.getLayerConfig("L3").enabled).toBe(true);
        expect(actual.toResolvedConfig().layers.L3.coverageThreshold).toBe(90);
      });
    });

    // UT-CF-009
    context("strict fixtureを渡した場合", () => {
      it("strictの設定を保持した集約を返す", () => {
        // Arrange
        const fixture = createStrictFixture();
        const featureName = createFeatureName("agentLessonCollection");

        // Act
        const actual = reconstituteHarnessConfig(fixture);

        // Assert
        expect(actual.getLayerConfig("L1").enabled).toBe(true);
        expect(actual.getLayerConfig("L2").enabled).toBe(true);
        expect(actual.getLayerConfig("L3").enabled).toBe(true);
        expect(actual.getLayerConfig("L4").enabled).toBe(true);
        expect(actual.isFeatureEnabled(featureName)).toBe(true);
      });
    });

    // UT-CF-010
    context("pendingEventsを省略した場合", () => {
      it("空配列で初期化される", () => {
        // Arrange
        const fixture = createMinimalFixture();

        // Act
        const actual = reconstituteHarnessConfig(fixture);

        // Assert
        expect(actual.pullDomainEvents()).toEqual([]);
      });
    });

    // UT-CF-011
    context("pendingEventsを指定した場合", () => {
      it("指定したイベントを保持する", () => {
        // Arrange
        const fixture = createMinimalFixture();
        const pendingEvents = [createPendingEvent()];

        // Act
        const actual = reconstituteHarnessConfig(fixture, pendingEvents);

        // Assert
        expect(actual.pullDomainEvents()).toEqual(pendingEvents);
      });
    });
  });

  describe("機能を切り替える", () => {
    // UT-CF-012
    context("agentLessonCollectionを有効化する場合", () => {
      it("sourceとresolvedの両方が更新される", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());
        const featureName = createFeatureName("agentLessonCollection");

        // Act
        harnessConfig.enableFeature(featureName);
        const actual = {
          source: harnessConfig.toSourceDocument(),
          resolved: harnessConfig.toResolvedConfig(),
        };

        // Assert
        expect(actual.source.harnesses.agentLessonCollection).toBe(true);
        expect(actual.resolved.harnesses.agentLessonCollection).toBe(true);
      });
    });

    // UT-CF-013
    context("cascadeUpdateを有効化する場合", () => {
      it("sourceとresolvedの両方が更新される", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());
        const featureName = createFeatureName("cascadeUpdate");

        // Act
        harnessConfig.enableFeature(featureName);
        const actual = {
          source: harnessConfig.toSourceDocument(),
          resolved: harnessConfig.toResolvedConfig(),
        };

        // Assert
        expect(actual.source.harnesses.cascadeUpdate).toBe(true);
        expect(actual.resolved.harnesses.cascadeUpdate).toBe(true);
      });
    });

    // UT-CF-014
    context("deadCodeGCを有効化する場合", () => {
      it("sourceとresolvedの両方が更新される", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());
        const featureName = createFeatureName("deadCodeGC");

        // Act
        harnessConfig.enableFeature(featureName);
        const actual = {
          source: harnessConfig.toSourceDocument(),
          resolved: harnessConfig.toResolvedConfig(),
        };

        // Assert
        expect(actual.source.harnesses.deadCodeGC).toBe(true);
        expect(actual.resolved.harnesses.deadCodeGC).toBe(true);
      });
    });

    // UT-CF-015
    context("bundleSizeLimitが0の状態で有効化する場合", () => {
      it("既定値500になる", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());
        const featureName = createFeatureName("bundleSizeLimit");

        // Act
        harnessConfig.enableFeature(featureName);
        const actual = {
          source: harnessConfig.toSourceDocument(),
          resolved: harnessConfig.toResolvedConfig(),
        };

        // Assert
        expect(actual.source.harnesses.bundleSizeLimit).toBe(500);
        expect(actual.resolved.harnesses.bundleSizeLimit).toBe(500);
      });
    });

    // UT-CF-016
    context("bundleSizeLimitが既に正値の場合", () => {
      it("値を維持する", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.sourceDocument.harnesses.bundleSizeLimit = 300;
        fixture.resolvedDocument.harnesses.bundleSizeLimit = 300;
        const harnessConfig = reconstituteHarnessConfig(fixture);
        const featureName = createFeatureName("bundleSizeLimit");

        // Act
        harnessConfig.enableFeature(featureName);
        const actual = {
          source: harnessConfig.toSourceDocument(),
          resolved: harnessConfig.toResolvedConfig(),
        };

        // Assert
        expect(actual.source.harnesses.bundleSizeLimit).toBe(300);
        expect(actual.resolved.harnesses.bundleSizeLimit).toBe(300);
      });
    });

    // UT-CF-017
    context("boolean機能を無効化する場合", () => {
      it("falseに更新される", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.sourceDocument.harnesses.agentLessonCollection = true;
        fixture.resolvedDocument.harnesses.agentLessonCollection = true;
        const harnessConfig = reconstituteHarnessConfig(fixture);
        const featureName = createFeatureName("agentLessonCollection");

        // Act
        harnessConfig.disableFeature(featureName);
        const actual = {
          source: harnessConfig.toSourceDocument(),
          resolved: harnessConfig.toResolvedConfig(),
        };

        // Assert
        expect(actual.source.harnesses.agentLessonCollection).toBe(false);
        expect(actual.resolved.harnesses.agentLessonCollection).toBe(false);
      });
    });

    // UT-CF-018
    context("bundleSizeLimitを無効化する場合", () => {
      it("0に更新される", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.sourceDocument.harnesses.bundleSizeLimit = 500;
        fixture.resolvedDocument.harnesses.bundleSizeLimit = 500;
        const harnessConfig = reconstituteHarnessConfig(fixture);
        const featureName = createFeatureName("bundleSizeLimit");

        // Act
        harnessConfig.disableFeature(featureName);
        const actual = {
          source: harnessConfig.toSourceDocument(),
          resolved: harnessConfig.toResolvedConfig(),
        };

        // Assert
        expect(actual.source.harnesses.bundleSizeLimit).toBe(0);
        expect(actual.resolved.harnesses.bundleSizeLimit).toBe(0);
      });
    });

    // UT-CF-019
    context("enableFeature実行後", () => {
      it("FeatureToggledイベントが追加される", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());
        const featureName = createFeatureName("agentLessonCollection");

        // Act
        harnessConfig.enableFeature(featureName);
        const actual = harnessConfig.pullDomainEvents();

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]).toMatchObject({
          type: "FeatureToggled",
          featureName: "agentLessonCollection",
          currentState: true,
        });
      });
    });

    // UT-CF-020
    context("disableFeature実行後", () => {
      it("FeatureToggledイベントが追加される", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.sourceDocument.harnesses.cascadeUpdate = true;
        fixture.resolvedDocument.harnesses.cascadeUpdate = true;
        const harnessConfig = reconstituteHarnessConfig(fixture);
        const featureName = createFeatureName("cascadeUpdate");

        // Act
        harnessConfig.disableFeature(featureName);
        const actual = harnessConfig.pullDomainEvents();

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]).toMatchObject({
          type: "FeatureToggled",
          featureName: "cascadeUpdate",
          currentState: false,
        });
      });
    });
  });

  describe("レイヤーと機能状態を参照する", () => {
    // UT-CF-025
    context("不正なレイヤーIDを指定した場合", () => {
      it("エラーになる", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());

        // Act
        const actual = () => harnessConfig.getLayerConfig("L5" as unknown as LayerId);

        // Assert
        expect(actual).toThrowError(UnknownLayerError);
        expect(actual).toThrowError(/L1-006/);
      });
    });

    // UT-CF-026
    context("boolean機能が有効の場合", () => {
      it("trueを返す", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.sourceDocument.harnesses.agentLessonCollection = true;
        fixture.resolvedDocument.harnesses.agentLessonCollection = true;
        const harnessConfig = reconstituteHarnessConfig(fixture);
        const featureName = createFeatureName("agentLessonCollection");

        // Act
        const actual = harnessConfig.isFeatureEnabled(featureName);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-027
    context("boolean機能が無効の場合", () => {
      it("falseを返す", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());
        const featureName = createFeatureName("agentLessonCollection");

        // Act
        const actual = harnessConfig.isFeatureEnabled(featureName);

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-CF-028
    context("bundleSizeLimitが正値の場合", () => {
      it("trueを返す", () => {
        // Arrange
        const fixture = createMinimalFixture();
        fixture.sourceDocument.harnesses.bundleSizeLimit = 500;
        fixture.resolvedDocument.harnesses.bundleSizeLimit = 500;
        const harnessConfig = reconstituteHarnessConfig(fixture);
        const featureName = createFeatureName("bundleSizeLimit");

        // Act
        const actual = harnessConfig.isFeatureEnabled(featureName);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-029
    context("bundleSizeLimitが0の場合", () => {
      it("falseを返す", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());
        const featureName = createFeatureName("bundleSizeLimit");

        // Act
        const actual = harnessConfig.isFeatureEnabled(featureName);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe("DTOとイベントを扱う", () => {
    // UT-CF-030
    context("解決済みDTOへ変換する場合", () => {
      it("resolved DTOを返す", () => {
        // Arrange
        const fixture = createMinimalFixture();
        const harnessConfig = reconstituteHarnessConfig(fixture);

        // Act
        const actual = harnessConfig.toResolvedConfig();

        // Assert
        expect(actual).toEqual(fixture.resolvedDocument);
      });
    });

    // UT-CF-031
    context("解決済みDTOへ変換した後に返却値を書き換える場合", () => {
      it("集約内部に影響しない", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());

        // Act
        const actual = harnessConfig.toResolvedConfig();
        actual.harnesses.bundleSizeLimit = 999;

        // Assert
        expect(harnessConfig.toResolvedConfig().harnesses.bundleSizeLimit).toBe(0);
      });
    });

    // UT-CF-032
    context("永続化用プレーンオブジェクトへ変換する場合", () => {
      it("sourceDocumentを返す", () => {
        // Arrange
        const fixture = createMinimalFixture();
        const harnessConfig = reconstituteHarnessConfig(fixture);

        // Act
        const actual = harnessConfig.toSourceDocument();

        // Assert
        expect(actual).toEqual(fixture.sourceDocument);
      });
    });

    // UT-CF-033
    context("sourceDocumentを書き換える場合", () => {
      it("defensive copyである", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());

        // Act
        const actual = harnessConfig.toSourceDocument();
        actual.project.name = "changed";
        actual.harnesses.agentLessonCollection = true;

        // Assert
        expect(harnessConfig.toSourceDocument().project.name).toBe("my-project");
        expect(harnessConfig.toSourceDocument().harnesses.agentLessonCollection).toBeUndefined();
      });
    });

    // UT-CF-034
    context("sourceDocumentに差分だけを持つ場合", () => {
      it("省略形を維持する", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());

        // Act
        const actual = harnessConfig.toSourceDocument();

        // Assert
        expect(actual.layers).toEqual({});
        expect(actual.harnesses).toEqual({});
      });
    });

    // UT-CF-035
    context("pullDomainEventsを連続で呼ぶ場合", () => {
      it("2回目は空配列になる", () => {
        // Arrange
        const harnessConfig = reconstituteHarnessConfig(createMinimalFixture());
        harnessConfig.enableFeature(createFeatureName("agentLessonCollection"));

        // Act
        const actual = harnessConfig.pullDomainEvents();

        // Assert
        expect(actual.length).toBeGreaterThan(0);
        expect(harnessConfig.pullDomainEvents()).toEqual([]);
      });
    });
  });
});
