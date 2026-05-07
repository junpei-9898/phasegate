// @unit phase-dependency-model
// @layer infrastructure
// @story H02-01
// @work-item-id WI-085
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  HarnessConfigPhaseConfigProvider,
  type PhaseConfigSection,
} from '../../../phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.js';
import { FULL_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/full-story-reflection-defaults.js';
import { STANDARD_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/standard-story-reflection-defaults.js';
import { MINIMAL_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/minimal-story-reflection-defaults.js';

const buildProvider = (section: PhaseConfigSection) =>
  new HarnessConfigPhaseConfigProvider({
    config: section,
    defaultOutputDir: '.harness/reports',
  });

target('HarnessConfigPhaseConfigProvider#getCustomizationPolicy', () => {
  describe('preset マッピング', () => {
    it.each([
      { input: 'full', expected: 'full' },
      { input: 'standard', expected: 'standard' },
      { input: 'minimal', expected: 'minimal' },
      { input: 'custom', expected: 'custom' },
    ] as const)('preset=$input → policy.preset=$expected', async ({ input, expected }) => {
      // Arrange
      const provider = buildProvider({
        customization: { preset: input },
      });

      // Act
      const policy = await provider.getCustomizationPolicy();

      // Assert
      expect(policy.preset).toBe(expected);
    });

    context('preset=default が指定された場合', () => {
      it('full にフォールバックする', async () => {
        // Arrange
        const provider = buildProvider({
          customization: { preset: 'default' },
        });

        // Act
        const policy = await provider.getCustomizationPolicy();

        // Assert
        expect(policy.preset).toBe('full');
      });
    });

    context('customization 未指定の場合', () => {
      it('full にフォールバックする', async () => {
        // Arrange
        const provider = buildProvider({});

        // Act
        const policy = await provider.getCustomizationPolicy();

        // Assert
        expect(policy.preset).toBe('full');
      });
    });
  });
});

target('HarnessConfigPhaseConfigProvider#getStoryReflectionConfig', () => {
  describe('preset デフォルト適用', () => {
    it('mappings 省略 × preset=full → FULL のデフォルトを返す', async () => {
      // Arrange
      const provider = buildProvider({
        customization: { preset: 'full' },
      });

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.equals(FULL_STORY_REFLECTION_DEFAULTS)).toBe(true);
    });

    it('mappings 省略 × preset=standard → STANDARD のデフォルトを返す', async () => {
      // Arrange
      const provider = buildProvider({
        customization: { preset: 'standard' },
      });

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.equals(STANDARD_STORY_REFLECTION_DEFAULTS)).toBe(true);
    });

    it('mappings 省略 × preset=minimal → MINIMAL (disabled) を返す', async () => {
      // Arrange
      const provider = buildProvider({
        customization: { preset: 'minimal' },
      });

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.equals(MINIMAL_STORY_REFLECTION_DEFAULTS)).toBe(true);
      expect(config.enabled).toBe(false);
    });

    it('preset=default (レガシー) → FULL にフォールバック', async () => {
      // Arrange
      const provider = buildProvider({
        customization: { preset: 'default' },
      });

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.equals(FULL_STORY_REFLECTION_DEFAULTS)).toBe(true);
    });
  });

  describe('storyReflection セクションのパース', () => {
    it('enabled=false 明示時はデフォルトを使わず disabled を返す', async () => {
      // Arrange
      const provider = buildProvider({
        customization: { preset: 'full' },
        storyReflection: { enabled: false },
      });

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.enabled).toBe(false);
      expect(config.mappings).toHaveLength(0);
    });

    it('mappings 明示指定 → 指定値をそのまま返す', async () => {
      // Arrange
      const provider = buildProvider({
        customization: { preset: 'full' },
        storyReflection: {
          enabled: true,
          mappings: [
            {
              inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
              product: 'docs/product/construction/{unit}/logical_design.md',
              required: true,
            },
          ],
        },
      });

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.mappings).toHaveLength(1);
      expect(config.mappings[0].inception).toBe(
        'docs/inception/{unit}/{storyId}/logical_design.md',
      );
      expect(config.mappings[0].required).toBe(true);
    });

    it('enabled=true × mappings 省略 → preset デフォルト mappings を適用', async () => {
      // Arrange
      const provider = buildProvider({
        customization: { preset: 'standard' },
        storyReflection: { enabled: true },
      });

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.mappings.length).toBe(
        STANDARD_STORY_REFLECTION_DEFAULTS.mappings.length,
      );
    });
  });
});

target('HarnessConfigPhaseConfigProvider#getPathRoots', () => {
  describe('paths セクションの解決', () => {
    // IT-PD-128
    context('paths.designDocs / paths.inceptionDocs を指定した場合', () => {
      it('指定値をそのまま返す', async () => {
        // Arrange
        const provider = buildProvider({
          paths: {
            designDocs: 'mydocs/product',
            inceptionDocs: 'mydocs/inception',
          },
        });

        // Act
        const actual = await provider.getPathRoots();

        // Assert
        expect(actual).toEqual({
          designDocsRoot: 'mydocs/product',
          inceptionDocsRoot: 'mydocs/inception',
        });
      });
    });

    // IT-PD-129
    context('paths セクション未指定の場合', () => {
      it('デフォルト値（docs/product/construction / docs/inception）を返す（後方互換）', async () => {
        // Arrange
        const provider = buildProvider({});

        // Act
        const actual = await provider.getPathRoots();

        // Assert
        expect(actual).toEqual({
          designDocsRoot: 'docs/product/construction',
          inceptionDocsRoot: 'docs/inception',
        });
      });
    });

    // IT-PD-130
    context('paths.designDocs のみ指定した場合', () => {
      it('inceptionDocsRoot はデフォルトに fallback する', async () => {
        // Arrange
        const provider = buildProvider({
          paths: { designDocs: 'mydocs/product' },
        });

        // Act
        const actual = await provider.getPathRoots();

        // Assert
        expect(actual).toEqual({
          designDocsRoot: 'mydocs/product',
          inceptionDocsRoot: 'docs/inception',
        });
      });
    });

    context('末尾スラッシュ付き設定の場合', () => {
      it('trim 処理されてスラッシュなし root が返る', async () => {
        // Arrange
        const provider = buildProvider({
          paths: {
            designDocs: 'mydocs/product/',
            inceptionDocs: 'mydocs/inception///',
          },
        });

        // Act
        const actual = await provider.getPathRoots();

        // Assert
        expect(actual).toEqual({
          designDocsRoot: 'mydocs/product',
          inceptionDocsRoot: 'mydocs/inception',
        });
      });
    });
  });
});
