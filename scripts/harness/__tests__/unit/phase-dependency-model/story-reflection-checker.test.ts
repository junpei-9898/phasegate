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

const createMockPort = (options: {
  storyDirs?: string[];
  existingFiles?: string[];
  annotatedFiles?: Map<string, string[]>;
  affectedStories?: Map<string, string[]>;
}): StoryReflectionFileSystemPort => ({
  listStoryDirectories: async () => options.storyDirs ?? [],
  storyAffectsUnit: async (storyId, unitId) =>
    (options.affectedStories ?? new Map()).get(storyId)?.includes(unitId) ?? true,
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
