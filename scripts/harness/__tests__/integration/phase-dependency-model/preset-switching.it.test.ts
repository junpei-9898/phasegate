// @unit phase-dependency-model
// @layer infrastructure
// @story A-7-7

/**
 * A-7-7: プリセット切替（minimal → standard → full）の統合テスト
 *
 * 同一のファイルシステム状態に対して、HarnessConfigPhaseConfigProvider の
 * preset を minimal / standard / full に切り替えた際に、
 * getCustomizationPolicy と getStoryReflectionConfig の結果が
 * プリセットごとに期待通り変化することを検証する。
 *
 * 配置理由: ドメイン定義 (FULL/STANDARD/MINIMAL_STORY_REFLECTION_DEFAULTS) と
 *           Provider 実装を結合した形でプリセット切替効果を E2E 確認する。
 */

import { expect, it } from 'vitest';

import { context, target } from '../../helpers/test-helpers.ts';
import {
  HarnessConfigPhaseConfigProvider,
  type PhaseConfigSection,
  type PhasePresetInput,
} from '../../../phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.js';
import { FULL_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/full-story-reflection-defaults.js';
import { STANDARD_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/standard-story-reflection-defaults.js';
import { MINIMAL_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/minimal-story-reflection-defaults.js';

function buildProvider(preset: PhasePresetInput): HarnessConfigPhaseConfigProvider {
  const section: PhaseConfigSection = {
    customization: { preset },
  };
  return new HarnessConfigPhaseConfigProvider({
    config: section,
    defaultOutputDir: '.harness/reports',
  });
}

target('プリセット切替統合テスト', () => {
  context('minimal → standard → full の順で切り替えた場合', () => {
    // IT-A7-7-001
    it('customizationPolicy.preset が切替後のプリセット名に追従すること', async () => {
      // Arrange & Act
      const minimalPolicy = await buildProvider('minimal').getCustomizationPolicy();
      const standardPolicy = await buildProvider('standard').getCustomizationPolicy();
      const fullPolicy = await buildProvider('full').getCustomizationPolicy();

      // Assert
      expect(minimalPolicy.preset).toBe('minimal');
      expect(standardPolicy.preset).toBe('standard');
      expect(fullPolicy.preset).toBe('full');
    });
  });

  context('preset=minimal の場合', () => {
    // IT-A7-7-002
    it('storyReflectionConfig は無効化され FS チェックが発火しないこと', async () => {
      // Arrange
      const provider = buildProvider('minimal');

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.enabled).toBe(false);
      expect(config.equals(MINIMAL_STORY_REFLECTION_DEFAULTS)).toBe(true);
    });
  });

  context('preset=standard の場合', () => {
    // IT-A7-7-003
    it('storyReflectionConfig は有効で STANDARD のデフォルト mappings が適用されること', async () => {
      // Arrange
      const provider = buildProvider('standard');

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.equals(STANDARD_STORY_REFLECTION_DEFAULTS)).toBe(true);
      expect(config.mappings.length).toBe(STANDARD_STORY_REFLECTION_DEFAULTS.mappings.length);
    });
  });

  context('preset=full の場合', () => {
    // IT-A7-7-004
    it('storyReflectionConfig は有効で FULL のデフォルト mappings が適用されること', async () => {
      // Arrange
      const provider = buildProvider('full');

      // Act
      const config = await provider.getStoryReflectionConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.equals(FULL_STORY_REFLECTION_DEFAULTS)).toBe(true);
      // FULL は logical / domain / uiux の 3 mappings を含む
      expect(config.mappings.length).toBeGreaterThanOrEqual(3);
    });
  });

  context('プリセット切替による mapping 件数の変化', () => {
    // IT-A7-7-005
    it('minimal < standard <= full の関係で mappings 件数が単調増加することを確認', async () => {
      // Arrange & Act
      const minimal = await buildProvider('minimal').getStoryReflectionConfig();
      const standard = await buildProvider('standard').getStoryReflectionConfig();
      const full = await buildProvider('full').getStoryReflectionConfig();

      // Assert
      expect(minimal.mappings.length).toBe(0);
      expect(standard.mappings.length).toBeGreaterThan(minimal.mappings.length);
      expect(full.mappings.length).toBeGreaterThanOrEqual(standard.mappings.length);
    });
  });

  context('preset=default (legacy) が指定された場合', () => {
    // IT-A7-7-006
    it('full にフォールバックされ FULL プリセットと同じ結果になること', async () => {
      // Arrange
      const defaultProvider = buildProvider('default');
      const fullProvider = buildProvider('full');

      // Act
      const defaultPolicy = await defaultProvider.getCustomizationPolicy();
      const defaultSr = await defaultProvider.getStoryReflectionConfig();
      const fullSr = await fullProvider.getStoryReflectionConfig();

      // Assert
      expect(defaultPolicy.preset).toBe('full');
      expect(defaultSr.equals(fullSr)).toBe(true);
    });
  });
});
