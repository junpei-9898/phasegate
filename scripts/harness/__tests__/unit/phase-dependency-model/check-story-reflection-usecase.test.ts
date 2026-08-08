// @unit phase-dependency-model
// @layer application
// @story H02-06
// @work-item-id WI-388

import { expect, it } from "vitest";
import { CheckStoryReflectionUseCase } from "../../../phase-dependency-model/application/usecases/check-story-reflection-usecase.js";
import type { StoryReflectionFileSystemPort } from "../../../phase-dependency-model/domain/ports/story-reflection-file-system-port.js";
import { StoryReflectionChecker } from "../../../phase-dependency-model/domain/services/story-reflection-checker.js";
import { StoryReflectionConfig } from "../../../phase-dependency-model/domain/values/story-reflection-config.js";
import { StoryReflectionMapping } from "../../../phase-dependency-model/domain/values/story-reflection-mapping.js";
import { context, target } from "../../helpers/test-helpers.ts";

const requiredMapping = StoryReflectionMapping.create({
  inception: "docs/inception/{unit}/{storyId}/logical_design.md",
  product: "docs/product/construction/{unit}/logical_design.md",
  required: true,
});

const optionalMapping = StoryReflectionMapping.create({
  inception: "docs/inception/{unit}/{storyId}/uiux_design.md",
  product: "docs/product/construction/{unit}/uiux_design.md",
  required: false,
});

const createPort = (options: {
  storyDirs?: string[];
  existingFiles?: string[];
  annotatedFiles?: Map<string, string[]>;
}): StoryReflectionFileSystemPort => ({
  listStoryDirectories: async () => options.storyDirs ?? [],
  storyAffectsUnit: async () => true,
  storyTouchesUnitLayer: async () => false,
  fileExists: async (path) => (options.existingFiles ?? []).includes(path),
  fileContainsStoryAnnotation: async (productPath, storyId) =>
    (options.annotatedFiles ?? new Map()).get(productPath)?.includes(storyId) ?? false,
});

target("CheckStoryReflectionUseCase.execute", () => {
  context("enabled=false の StoryReflectionConfig が渡された場合", () => {
    it("即座に passed=true の結果を返すこと", async () => {
      // Arrange
      const port = createPort({ storyDirs: ["US-001"] });
      const useCase = new CheckStoryReflectionUseCase({
        checker: new StoryReflectionChecker(port),
      });
      const config = StoryReflectionConfig.disabled();

      // Act
      const actual = await useCase.execute({ unitId: "order", config });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
    });
  });

  context("inception に storyId が存在し product 未反映の場合", () => {
    it("required mapping のとき violations に追加されブロック扱いになること", async () => {
      // Arrange
      const port = createPort({
        storyDirs: ["US-002"],
        existingFiles: ["docs/inception/order/US-002/logical_design.md"],
        annotatedFiles: new Map(),
      });
      const useCase = new CheckStoryReflectionUseCase({
        checker: new StoryReflectionChecker(port),
      });
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });

      // Act
      const actual = await useCase.execute({ unitId: "order", config });

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.violations).toHaveLength(1);
      expect(actual.violations[0].storyId).toBe("US-002");
      expect(actual.violations[0].productPath).toBe("docs/product/construction/order/logical_design.md");
    });
  });

  context("inception に storyId が存在し product 反映済みの場合", () => {
    it("passed=true の結果が返ること", async () => {
      // Arrange
      const port = createPort({
        storyDirs: ["US-003"],
        existingFiles: ["docs/inception/order/US-003/logical_design.md"],
        annotatedFiles: new Map([["docs/product/construction/order/logical_design.md", ["US-003"]]]),
      });
      const useCase = new CheckStoryReflectionUseCase({
        checker: new StoryReflectionChecker(port),
      });
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });

      // Act
      const actual = await useCase.execute({ unitId: "order", config });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
    });
  });

  context("optional mapping で product 未反映の場合", () => {
    it("warnings に追加され violations は空となること", async () => {
      // Arrange
      const port = createPort({
        storyDirs: ["US-004"],
        existingFiles: ["docs/inception/order/US-004/uiux_design.md"],
        annotatedFiles: new Map(),
      });
      const useCase = new CheckStoryReflectionUseCase({
        checker: new StoryReflectionChecker(port),
      });
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [optionalMapping],
      });

      // Act
      const actual = await useCase.execute({ unitId: "order", config });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(1);
    });
  });

  context("inception に storyId ディレクトリが存在しない場合", () => {
    it("チェックをスキップして passed=true を返すこと", async () => {
      // Arrange
      const port = createPort({ storyDirs: [] });
      const useCase = new CheckStoryReflectionUseCase({
        checker: new StoryReflectionChecker(port),
      });
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });

      // Act
      const actual = await useCase.execute({ unitId: "order", config });

      // Assert
      expect(actual.passed).toBe(true);
    });
  });
});
