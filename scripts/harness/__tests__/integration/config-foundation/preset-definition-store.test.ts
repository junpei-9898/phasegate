// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { PresetDefinitionStore } from '../../../config-foundation/infrastructure/preset-definition-store.js';

target('PresetDefinitionStore', () => {
  describe('load', () => {
    context('全Presetを取得する場合', () => {
      it('IT-CF-054: minimalとstandardとstrictを返すこと', () => {
        // Arrange
        const store = new PresetDefinitionStore();

        // Act
        const actual = store.load();

        // Assert
        expect(Object.keys(actual)).toEqual(['minimal', 'standard', 'strict']);
      });
    });

    context('各Presetの必須セクションを確認する場合', () => {
      it('IT-CF-055: 各Presetに主要セクションが存在すること', () => {
        // Arrange
        const store = new PresetDefinitionStore();

        // Act
        const actual = store.load();

        // Assert
        expect(actual.minimal.layers).toBeDefined();
        expect(actual.minimal.quickMode).toBeDefined();
        expect(actual.minimal.harnesses).toBeDefined();
        expect(actual.minimal.paths).toBeDefined();
        expect(actual.minimal.reporting).toBeDefined();
        expect(actual.standard.layers).toBeDefined();
        expect(actual.strict.layers).toBeDefined();
      });
    });

    context('minimal Presetを確認する場合', () => {
      it('IT-CF-056: L3とL4が無効であること', () => {
        // Arrange
        const store = new PresetDefinitionStore();

        // Act
        const actual = store.load();

        // Assert
        expect(actual.minimal.layers.L3.enabled).toBe(false);
        expect(actual.minimal.layers.L4.enabled).toBe(false);
      });
    });

    context('strict PresetのL3閾値を確認する場合', () => {
      it('IT-CF-057: coverageThresholdが95であること', () => {
        // Arrange
        const store = new PresetDefinitionStore();

        // Act
        const actual = store.load();

        // Assert
        expect(actual.strict.layers.L3.coverageThreshold).toBe(95);
      });
    });

    context('strict PresetのGSD機能を確認する場合', () => {
      it('IT-CF-058: strictの品質機能が設計値どおりであること', () => {
        // Arrange
        const store = new PresetDefinitionStore();

        // Act
        const actual = store.load();

        // Assert
        expect(actual.strict.harnesses.agentLessonCollection).toBe(true);
        expect(actual.strict.harnesses.deadCodeGC).toBe(true);
        expect(actual.strict.harnesses.bundleSizeLimit).toBe(500);
      });
    });
  });
});
