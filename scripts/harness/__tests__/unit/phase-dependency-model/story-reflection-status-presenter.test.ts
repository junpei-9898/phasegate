// @unit phase-dependency-model
// @layer presentation
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StoryReflectionConfig } from '../../../phase-dependency-model/domain/values/story-reflection-config.js';
import { StoryReflectionMapping } from '../../../phase-dependency-model/domain/values/story-reflection-mapping.js';
import { StoryReflectionResult } from '../../../phase-dependency-model/domain/values/story-reflection-result.js';
import { StoryReflectionStatusPresenter } from '../../../phase-dependency-model/presentation/cli/story-reflection-status-presenter.js';

target('StoryReflectionStatusPresenter#formatStatusLine', () => {
  context('storyReflection が有効で mapping が 3 件、プリセットが full の場合', () => {
    it('enabled / preset / mapping 数を含むサマリー行を返す', () => {
      // Arrange
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [
          StoryReflectionMapping.create({
            inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
            product: 'docs/product/construction/{unit}/logical_design.md',
            required: true,
          }),
          StoryReflectionMapping.create({
            inception: 'docs/inception/{unit}/{storyId}/domain_model.md',
            product: 'docs/product/construction/{unit}/domain_model.md',
            required: true,
          }),
          StoryReflectionMapping.create({
            inception: 'docs/inception/{unit}/{storyId}/uiux_design.md',
            product: 'docs/product/construction/{unit}/uiux_design.md',
            required: false,
          }),
        ],
      });
      const presenter = new StoryReflectionStatusPresenter();

      // Act
      const actual = presenter.formatStatusLine({ config, preset: 'full' });

      // Assert
      expect(actual).toContain('storyReflection');
      expect(actual).toContain('enabled');
      expect(actual).toContain('preset=full');
      expect(actual).toContain('mappings=3');
      expect(actual).toContain('required=2');
      expect(actual).toContain('optional=1');
    });
  });

  context('storyReflection が無効な場合', () => {
    it('disabled を示す行を返し mapping 数は 0 を表示する', () => {
      // Arrange
      const config = StoryReflectionConfig.disabled();
      const presenter = new StoryReflectionStatusPresenter();

      // Act
      const actual = presenter.formatStatusLine({ config, preset: 'minimal' });

      // Assert
      expect(actual).toContain('storyReflection');
      expect(actual).toContain('disabled');
      expect(actual).toContain('preset=minimal');
      expect(actual).toContain('mappings=0');
    });
  });
});

target('StoryReflectionStatusPresenter#formatValidationSummary', () => {
  context('storyReflection が無効な場合', () => {
    it('disabled の notice を返し violations/warnings は 0 を表示する', () => {
      // Arrange
      const presenter = new StoryReflectionStatusPresenter();
      const disabledConfig = StoryReflectionConfig.disabled();

      // Act
      const actual = presenter.formatValidationSummary({
        config: disabledConfig,
        preset: 'minimal',
        result: StoryReflectionResult.pass(),
      });

      // Assert
      expect(actual).toContain('[L2-STORY-REFLECTION]');
      expect(actual).toContain('disabled');
      expect(actual).toContain('violations=0');
      expect(actual).toContain('warnings=0');
    });
  });

  context('storyReflection が有効かつ違反なしの場合', () => {
    it('passed サマリーを返す', () => {
      // Arrange
      const presenter = new StoryReflectionStatusPresenter();
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [
          StoryReflectionMapping.create({
            inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
            product: 'docs/product/construction/{unit}/logical_design.md',
            required: true,
          }),
        ],
      });

      // Act
      const actual = presenter.formatValidationSummary({
        config,
        preset: 'full',
        result: StoryReflectionResult.pass(),
      });

      // Assert
      expect(actual).toContain('[L2-STORY-REFLECTION]');
      expect(actual).toContain('passed');
      expect(actual).toContain('violations=0');
      expect(actual).toContain('warnings=0');
    });
  });

  context('storyReflection が有効かつ violation が存在する場合', () => {
    it('違反件数と代表 storyId を含む failed サマリーを返す', () => {
      // Arrange
      const presenter = new StoryReflectionStatusPresenter();
      const mapping = StoryReflectionMapping.create({
        inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
        product: 'docs/product/construction/{unit}/logical_design.md',
        required: true,
      });
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [mapping],
      });
      const result = StoryReflectionResult.create({
        violations: [
          {
            storyId: 'US-002',
            mapping,
            inceptionPath: 'docs/inception/order/US-002/logical_design.md',
            productPath: 'docs/product/construction/order/logical_design.md',
          },
        ],
        warnings: [],
      });

      // Act
      const actual = presenter.formatValidationSummary({
        config,
        preset: 'full',
        result,
      });

      // Assert
      expect(actual).toContain('[L2-STORY-REFLECTION]');
      expect(actual).toContain('failed');
      expect(actual).toContain('violations=1');
      expect(actual).toContain('US-002');
      expect(actual).toContain('docs/product/construction/order/logical_design.md');
    });
  });
});
