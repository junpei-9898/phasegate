// @unit phase-dependency-model
// @layer domain
// @story H02-06
import { describe, expect, it } from "vitest";
import type { StoryReflectionFileSystemPort } from "../../../phase-dependency-model/domain/ports/story-reflection-file-system-port.js";
import { StoryReflectionChecker } from "../../../phase-dependency-model/domain/services/story-reflection-checker.js";
import { StoryReflectionConfig } from "../../../phase-dependency-model/domain/values/story-reflection-config.js";
import { StoryReflectionMapping } from "../../../phase-dependency-model/domain/values/story-reflection-mapping.js";
import { target } from "../../helpers/test-helpers.ts";

const requiredMapping = StoryReflectionMapping.create({
  inception: "docs/inception/{unit}/{storyId}/logical_design.md",
  product: "docs/product/construction/{unit}/logical_design.md",
  required: true,
});

const optionalMapping = StoryReflectionMapping.create({
  inception: "docs/inception/{unit}/{storyId}/test_design.md",
  product: "docs/product/construction/{unit}/test_design.md",
  required: false,
});

const domainModelMapping = StoryReflectionMapping.create({
  inception: "docs/inception/{unit}/{storyId}/domain_model.md",
  product: "docs/product/construction/{unit}/domain_model.md",
  required: true,
});

type LayerAwareStoryReflectionFileSystemPort = StoryReflectionFileSystemPort & {
  storyTouchesUnitLayer(storyId: string, unitId: string, layer: string): Promise<boolean>;
};

const createMockPort = (options: {
  storyDirs?: string[];
  existingFiles?: string[];
  annotatedFiles?: Map<string, string[]>;
  affectedStories?: Map<string, string[]>;
  touchedLayers?: Map<string, string[]>;
}): LayerAwareStoryReflectionFileSystemPort => ({
  listStoryDirectories: async () => options.storyDirs ?? [],
  storyAffectsUnit: async (storyId, unitId) =>
    (options.affectedStories ?? new Map()).get(storyId)?.includes(unitId) ?? true,
  storyTouchesUnitLayer: async (storyId, unitId, layer) =>
    (options.touchedLayers ?? new Map()).get(`${storyId}:${unitId}`)?.includes(layer) ?? false,
  fileExists: async (path) => (options.existingFiles ?? []).includes(path),
  fileContainsStoryAnnotation: async (productPath, storyId) =>
    (options.annotatedFiles ?? new Map()).get(productPath)?.includes(storyId) ?? false,
});

target("StoryReflectionChecker", () => {
  describe("check", () => {
    it("inception 存在 × product 反映済み → pass", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ["US-001"],
        existingFiles: ["docs/inception/my-unit/US-001/logical_design.md"],
        annotatedFiles: new Map([["docs/product/construction/my-unit/logical_design.md", ["US-001"]]]),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(0);
    });

    it("inception 存在 × product 未反映 × required → fail", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ["US-001"],
        existingFiles: ["docs/inception/my-unit/US-001/logical_design.md"],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.violations).toHaveLength(1);
      expect(actual.violations[0].storyId).toBe("US-001");
      expect(actual.violations[0].inceptionPath).toBe("docs/inception/my-unit/US-001/logical_design.md");
      expect(actual.violations[0].productPath).toBe("docs/product/construction/my-unit/logical_design.md");
    });

    it("inception 存在 × product 未反映 × optional → warning のみ", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [optionalMapping],
      });
      const port = createMockPort({
        storyDirs: ["US-001"],
        existingFiles: ["docs/inception/my-unit/US-001/test_design.md"],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(1);
      expect(actual.warnings[0].storyId).toBe("US-001");
    });

    it("inception 不存在 → skip", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ["US-001"],
        existingFiles: [],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(0);
    });

    it("config.enabled: false → 常に pass", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: false,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ["US-001"],
        existingFiles: ["docs/inception/my-unit/US-001/logical_design.md"],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(0);
    });

    it("複数 storyId × 複数 mapping の組み合わせ検証", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping, optionalMapping],
      });
      const port = createMockPort({
        storyDirs: ["US-001", "US-002"],
        existingFiles: [
          "docs/inception/my-unit/US-001/logical_design.md",
          "docs/inception/my-unit/US-001/test_design.md",
          "docs/inception/my-unit/US-002/logical_design.md",
          "docs/inception/my-unit/US-002/test_design.md",
        ],
        annotatedFiles: new Map([["docs/product/construction/my-unit/logical_design.md", ["US-001"]]]),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      // US-001 required: annotated → OK
      // US-001 optional: not annotated → warning
      // US-002 required: not annotated → violation
      // US-002 optional: not annotated → warning
      expect(actual.passed).toBe(false);
      expect(actual.violations).toHaveLength(1);
      expect(actual.violations[0].storyId).toBe("US-002");
      expect(actual.warnings).toHaveLength(2);
    });

    it("storyId ディレクトリが空 → pass", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: [],
        existingFiles: [],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(0);
    });

    it("cross WI が対象Unitに影響し product 未反映の場合は violation になる", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ["WI-026"],
        existingFiles: ["docs/inception/_cross/WI-026/logical_design.md"],
        annotatedFiles: new Map(),
        affectedStories: new Map([["WI-026", ["my-unit"]]]),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.violations).toHaveLength(1);
      expect(actual.violations[0].storyId).toBe("WI-026");
      expect(actual.violations[0].inceptionPath).toBe("docs/inception/_cross/WI-026/logical_design.md");
      expect(actual.violations[0].productPath).toBe("docs/product/construction/my-unit/logical_design.md");
    });

    it("cross WI が対象Unitに影響しない場合は検査対象から除外される", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ["WI-026"],
        existingFiles: ["docs/inception/_cross/WI-026/logical_design.md"],
        annotatedFiles: new Map(),
        affectedStories: new Map([["WI-026", ["another-unit"]]]),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(0);
    });

    describe("layer-aware reflection requirement (WI-246)", () => {
      it("domain層を触れたcross WIはdomain_model反映を引き続き要求する", async () => {
        // Arrange
        const config = StoryReflectionConfig.create({
          enabled: true,
          mappings: [domainModelMapping],
        });
        const port = createMockPort({
          storyDirs: ["WI-900"],
          existingFiles: ["docs/inception/_cross/WI-900/domain_model.md"],
          annotatedFiles: new Map(),
          affectedStories: new Map([["WI-900", ["order"]]]),
          touchedLayers: new Map([["WI-900:order", ["domain"]]]),
        });
        const checker = new StoryReflectionChecker(port);

        // Act
        const actual = await checker.check("order", config);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.violations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              storyId: "WI-900",
              inceptionPath: "docs/inception/_cross/WI-900/domain_model.md",
              productPath: "docs/product/construction/order/domain_model.md",
            }),
          ]),
        );
      });

      it("infra/appのみのcross WIはlogical_designのみ要求されdomain_modelは要求されない", async () => {
        // Arrange
        const config = StoryReflectionConfig.create({
          enabled: true,
          mappings: [requiredMapping, domainModelMapping],
        });
        const port = createMockPort({
          storyDirs: ["WI-900"],
          existingFiles: [
            "docs/inception/_cross/WI-900/logical_design.md",
            "docs/inception/_cross/WI-900/domain_model.md",
          ],
          annotatedFiles: new Map(),
          affectedStories: new Map([["WI-900", ["order"]]]),
          touchedLayers: new Map([["WI-900:order", ["application", "infrastructure"]]]),
        });
        const checker = new StoryReflectionChecker(port);

        // Act
        const actual = await checker.check("order", config);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.violations).toHaveLength(1);
        expect(actual.violations[0]).toEqual(
          expect.objectContaining({
            storyId: "WI-900",
            inceptionPath: "docs/inception/_cross/WI-900/logical_design.md",
            productPath: "docs/product/construction/order/logical_design.md",
          }),
        );
        expect(actual.violations).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              productPath: "docs/product/construction/order/domain_model.md",
            }),
          ]),
        );
      });

      it("affectsが空/未定義のcross WIはどのunitにも反映要求を発火しない", async () => {
        // Arrange
        const config = StoryReflectionConfig.create({
          enabled: true,
          mappings: [requiredMapping, domainModelMapping],
        });
        const port = createMockPort({
          storyDirs: ["WI-900"],
          existingFiles: [
            "docs/inception/_cross/WI-900/logical_design.md",
            "docs/inception/_cross/WI-900/domain_model.md",
          ],
          annotatedFiles: new Map(),
          affectedStories: new Map([["WI-900", []]]),
          touchedLayers: new Map([["WI-900:order", ["domain"]]]),
        });
        const checker = new StoryReflectionChecker(port);

        // Act
        const actual = await checker.check("order", config);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.violations).toHaveLength(0);
        expect(actual.warnings).toHaveLength(0);
      });

      it("unit-local WIはtouch判定に関係なくdomain_model反映を要求する", async () => {
        // Arrange
        const config = StoryReflectionConfig.create({
          enabled: true,
          mappings: [domainModelMapping],
        });
        const port = createMockPort({
          storyDirs: ["US-900"],
          existingFiles: ["docs/inception/order/US-900/domain_model.md"],
          annotatedFiles: new Map(),
          touchedLayers: new Map([["US-900:order", []]]),
        });
        const checker = new StoryReflectionChecker(port);

        // Act
        const actual = await checker.check("order", config);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.violations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              storyId: "US-900",
              inceptionPath: "docs/inception/order/US-900/domain_model.md",
              productPath: "docs/product/construction/order/domain_model.md",
            }),
          ]),
        );
      });
    });
  });

  describe("isBlocked", () => {
    it("isBlocked は violations がある場合 true", async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ["US-001"],
        existingFiles: ["docs/inception/my-unit/US-001/logical_design.md"],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const actual = await checker.check("my-unit", config);

      // Assert
      expect(actual.isBlocked()).toBe(true);
      expect(actual.violations).toHaveLength(1);
    });
  });
});
