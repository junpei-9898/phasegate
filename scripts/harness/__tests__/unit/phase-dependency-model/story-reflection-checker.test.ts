// @unit phase-dependency-model
// @layer domain
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StoryReflectionMapping } from '../../../phase-dependency-model/domain/values/story-reflection-mapping.js';
import { StoryReflectionConfig } from '../../../phase-dependency-model/domain/values/story-reflection-config.js';
import { StoryReflectionChecker } from '../../../phase-dependency-model/domain/services/story-reflection-checker.js';
import type { StoryReflectionFileSystemPort } from '../../../phase-dependency-model/domain/ports/story-reflection-file-system-port.js';

const requiredMapping = StoryReflectionMapping.create({
  inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
  product: 'docs/product/construction/{unit}/logical_design.md',
  required: true,
});

const optionalMapping = StoryReflectionMapping.create({
  inception: 'docs/inception/{unit}/{storyId}/test_design.md',
  product: 'docs/product/construction/{unit}/test_design.md',
  required: false,
});

const createMockPort = (options: {
  storyDirs?: string[];
  existingFiles?: string[];
  annotatedFiles?: Map<string, string[]>;
}): StoryReflectionFileSystemPort => ({
  listStoryDirectories: async () => options.storyDirs ?? [],
  fileExists: async (path) => (options.existingFiles ?? []).includes(path),
  fileContainsStoryAnnotation: async (productPath, storyId) =>
    (options.annotatedFiles ?? new Map()).get(productPath)?.includes(storyId) ??
    false,
});

target('StoryReflectionChecker', () => {
  describe('check', () => {
    it('inception 存在 × product 反映済み → pass', async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ['US-001'],
        existingFiles: [
          'docs/inception/my-unit/US-001/logical_design.md',
        ],
        annotatedFiles: new Map([
          ['docs/product/construction/my-unit/logical_design.md', ['US-001']],
        ]),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const result = await checker.check('my-unit', config);

      // Assert
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('inception 存在 × product 未反映 × required → fail', async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ['US-001'],
        existingFiles: [
          'docs/inception/my-unit/US-001/logical_design.md',
        ],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const result = await checker.check('my-unit', config);

      // Assert
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].storyId).toBe('US-001');
      expect(result.violations[0].inceptionPath).toBe(
        'docs/inception/my-unit/US-001/logical_design.md',
      );
      expect(result.violations[0].productPath).toBe(
        'docs/product/construction/my-unit/logical_design.md',
      );
    });

    it('inception 存在 × product 未反映 × optional → warning のみ', async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [optionalMapping],
      });
      const port = createMockPort({
        storyDirs: ['US-001'],
        existingFiles: [
          'docs/inception/my-unit/US-001/test_design.md',
        ],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const result = await checker.check('my-unit', config);

      // Assert
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].storyId).toBe('US-001');
    });

    it('inception 不存在 → skip', async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ['US-001'],
        existingFiles: [],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const result = await checker.check('my-unit', config);

      // Assert
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('config.enabled: false → 常に pass', async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: false,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ['US-001'],
        existingFiles: [
          'docs/inception/my-unit/US-001/logical_design.md',
        ],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const result = await checker.check('my-unit', config);

      // Assert
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('複数 storyId × 複数 mapping の組み合わせ検証', async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping, optionalMapping],
      });
      const port = createMockPort({
        storyDirs: ['US-001', 'US-002'],
        existingFiles: [
          'docs/inception/my-unit/US-001/logical_design.md',
          'docs/inception/my-unit/US-001/test_design.md',
          'docs/inception/my-unit/US-002/logical_design.md',
          'docs/inception/my-unit/US-002/test_design.md',
        ],
        annotatedFiles: new Map([
          ['docs/product/construction/my-unit/logical_design.md', ['US-001']],
        ]),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const result = await checker.check('my-unit', config);

      // Assert
      // US-001 required: annotated → OK
      // US-001 optional: not annotated → warning
      // US-002 required: not annotated → violation
      // US-002 optional: not annotated → warning
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].storyId).toBe('US-002');
      expect(result.warnings).toHaveLength(2);
    });

    it('storyId ディレクトリが空 → pass', async () => {
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
      const result = await checker.check('my-unit', config);

      // Assert
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('isBlocked', () => {
    it('isBlocked は violations がある場合 true', async () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping],
      });
      const port = createMockPort({
        storyDirs: ['US-001'],
        existingFiles: [
          'docs/inception/my-unit/US-001/logical_design.md',
        ],
        annotatedFiles: new Map(),
      });
      const checker = new StoryReflectionChecker(port);

      // Act
      const result = await checker.check('my-unit', config);

      // Assert
      expect(result.isBlocked()).toBe(true);
      expect(result.violations).toHaveLength(1);
    });
  });
});
