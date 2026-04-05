// @unit phase-dependency-model
// @layer domain
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StoryReflectionMapping } from '../../../phase-dependency-model/domain/values/story-reflection-mapping.js';
import {
  StoryReflectionConfig,
  type StoryReflectionConfigCreateArgs,
} from '../../../phase-dependency-model/domain/values/story-reflection-config.js';

const requiredMapping1 = StoryReflectionMapping.create({
  inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
  product: 'docs/product/construction/{unit}/logical_design.md',
  required: true,
});

const requiredMapping2 = StoryReflectionMapping.create({
  inception: 'docs/inception/{unit}/{storyId}/domain_model.md',
  product: 'docs/product/construction/{unit}/domain_model.md',
  required: true,
});

const optionalMapping = StoryReflectionMapping.create({
  inception: 'docs/inception/{unit}/{storyId}/test_design.md',
  product: 'docs/product/construction/{unit}/test_design.md',
  required: false,
});

const defaultArgs: StoryReflectionConfigCreateArgs = {
  enabled: true,
  mappings: [requiredMapping1, requiredMapping2, optionalMapping],
};

target('StoryReflectionConfig', () => {
  describe('create', () => {
    it('有効な config を生成できる', () => {
      // Arrange & Act
      const config = StoryReflectionConfig.create(defaultArgs);

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.mappings).toHaveLength(3);
      expect(config.mappings[0]).toBe(requiredMapping1);
      expect(config.mappings[1]).toBe(requiredMapping2);
      expect(config.mappings[2]).toBe(optionalMapping);
    });

    it('mappings が空の config を生成できる', () => {
      // Arrange
      const args: StoryReflectionConfigCreateArgs = {
        enabled: true,
        mappings: [],
      };

      // Act
      const config = StoryReflectionConfig.create(args);

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.mappings).toHaveLength(0);
    });

    it('enabled: false + mappings ありは許容される', () => {
      // Arrange
      const args: StoryReflectionConfigCreateArgs = {
        enabled: false,
        mappings: [requiredMapping1],
      };

      // Act & Assert
      expect(() => StoryReflectionConfig.create(args)).not.toThrow();
      const config = StoryReflectionConfig.create(args);
      expect(config.enabled).toBe(false);
      expect(config.mappings).toHaveLength(1);
    });
  });

  describe('disabled', () => {
    it('disabled() は enabled: false で空 mappings', () => {
      // Arrange & Act
      const config = StoryReflectionConfig.disabled();

      // Assert
      expect(config.enabled).toBe(false);
      expect(config.mappings).toHaveLength(0);
    });
  });

  describe('requiredMappings', () => {
    it('requiredMappings は required: true のみ返す', () => {
      // Arrange
      const config = StoryReflectionConfig.create(defaultArgs);

      // Act
      const required = config.requiredMappings();

      // Assert
      expect(required).toHaveLength(2);
      expect(required[0]).toBe(requiredMapping1);
      expect(required[1]).toBe(requiredMapping2);
    });
  });

  describe('optionalMappings', () => {
    it('optionalMappings は required: false のみ返す', () => {
      // Arrange
      const config = StoryReflectionConfig.create(defaultArgs);

      // Act
      const optional = config.optionalMappings();

      // Assert
      expect(optional).toHaveLength(1);
      expect(optional[0]).toBe(optionalMapping);
    });
  });

  describe('equals', () => {
    it('同一内容の config は equals が true', () => {
      // Arrange
      const a = StoryReflectionConfig.create(defaultArgs);
      const b = StoryReflectionConfig.create(defaultArgs);

      // Act & Assert
      expect(a.equals(b)).toBe(true);
    });

    it('enabled が異なれば equals が false', () => {
      // Arrange
      const a = StoryReflectionConfig.create({ ...defaultArgs, enabled: true });
      const b = StoryReflectionConfig.create({ ...defaultArgs, enabled: false });

      // Act & Assert
      expect(a.equals(b)).toBe(false);
    });
  });
});
