// @work-item-id WI-220
// @story H02-05
// @unit phase-dependency-model
// @layer domain
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  StoryReflectionMapping,
  type StoryReflectionMappingCreateArgs,
} from '../../../phase-dependency-model/domain/values/story-reflection-mapping.js';

const defaultArgs: StoryReflectionMappingCreateArgs = {
  inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
  product: 'docs/product/construction/{unit}/logical_design.md',
  required: true,
};

target('StoryReflectionMapping', () => {
  it('任意ルートを指定した場合だけinceptionとconstructionの配置先を解決すること', () => {
    const mapping = StoryReflectionMapping.create(defaultArgs);
    const actual = mapping.resolve({ unitId: 'order', storyId: 'WI-1' }, {
      inceptionDocsRoot: 'design/proposals', designDocsRoot: 'design/approved',
    });
    expect(actual).toEqual({ inception: 'design/proposals/order/WI-1/logical_design.md', product: 'design/approved/order/logical_design.md' });
    expect(mapping.resolve({ unitId: 'order', storyId: 'WI-1' })).toEqual({
      inception: 'docs/inception/order/WI-1/logical_design.md', product: 'docs/product/construction/order/logical_design.md',
    });
  });

  it.each(['docs/product/units/{unit}.md', 'docs/product/construction-notes/{unit}.md'])('construction外のmapping %sは移設しないこと', (product) => {
    const mapping = StoryReflectionMapping.create({ ...defaultArgs, product });
    const actual = mapping.resolve({ unitId: 'order', storyId: 'WI-1' }, { inceptionDocsRoot: 'proposals', designDocsRoot: 'approved' });
    expect(actual.product).toBe(product.replace('{unit}', 'order'));
    expect(actual.inception).toBe('proposals/order/WI-1/logical_design.md');
  });
  describe('create', () => {
    it('正常な mapping を生成できる', () => {
      // Arrange & Act
      const mapping = StoryReflectionMapping.create(defaultArgs);

      // Assert
      expect(mapping.inception).toBe(defaultArgs.inception);
      expect(mapping.product).toBe(defaultArgs.product);
      expect(mapping.required).toBe(true);
    });

    it('inception が docs/inception/ で始まらない場合エラー', () => {
      // Arrange
      const args: StoryReflectionMappingCreateArgs = {
        ...defaultArgs,
        inception: 'docs/product/{unit}/{storyId}/logical_design.md',
      };

      // Act & Assert
      expect(() => StoryReflectionMapping.create(args)).toThrow();
    });

    it('product が docs/product/ で始まらない場合エラー', () => {
      // Arrange
      const args: StoryReflectionMappingCreateArgs = {
        ...defaultArgs,
        product: 'docs/inception/{unit}/logical_design.md',
      };

      // Act & Assert
      expect(() => StoryReflectionMapping.create(args)).toThrow();
    });

    it('inception に {storyId} がない場合エラー', () => {
      // Arrange
      const args: StoryReflectionMappingCreateArgs = {
        ...defaultArgs,
        inception: 'docs/inception/{unit}/logical_design.md',
      };

      // Act & Assert
      expect(() => StoryReflectionMapping.create(args)).toThrow();
    });

    it('inception に {unit} がない場合エラー', () => {
      // Arrange
      const args: StoryReflectionMappingCreateArgs = {
        ...defaultArgs,
        inception: 'docs/inception/{storyId}/logical_design.md',
      };

      // Act & Assert
      expect(() => StoryReflectionMapping.create(args)).toThrow();
    });

    it('product に {unit} がない場合エラー', () => {
      // Arrange
      const args: StoryReflectionMappingCreateArgs = {
        ...defaultArgs,
        product: 'docs/product/construction/logical_design.md',
      };

      // Act & Assert
      expect(() => StoryReflectionMapping.create(args)).toThrow();
    });
  });

  describe('resolve', () => {
    it('resolve で {unit} と {storyId} が置換される', () => {
      // Arrange
      const mapping = StoryReflectionMapping.create(defaultArgs);

      // Act
      const resolved = mapping.resolve({ unitId: 'my-unit', storyId: 'US-001' });

      // Assert
      expect(resolved.inception).toBe('docs/inception/my-unit/US-001/logical_design.md');
      expect(resolved.product).toBe('docs/product/construction/my-unit/logical_design.md');
    });
  });

  describe('equals', () => {
    it('同一パスの mapping は equals が true', () => {
      // Arrange
      const a = StoryReflectionMapping.create(defaultArgs);
      const b = StoryReflectionMapping.create(defaultArgs);

      // Act & Assert
      expect(a.equals(b)).toBe(true);
    });

    it('required: true と false で equals が false', () => {
      // Arrange
      const a = StoryReflectionMapping.create({ ...defaultArgs, required: true });
      const b = StoryReflectionMapping.create({ ...defaultArgs, required: false });

      // Act & Assert
      expect(a.equals(b)).toBe(false);
    });
  });
});
