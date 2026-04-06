// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FeatureToggle } from '../../../config-foundation/domain/value-objects/feature-toggle.js';
import { FeatureName } from '../../../config-foundation/domain/value-objects/feature-name.js';

const AVAILABLE_FEATURES = [
  'agentLessonCollection',
  'cascadeUpdate',
  'bundleSizeLimit',
  'deadCodeGC',
] as const;

function createFeatureName(name: string): FeatureName {
  return FeatureName.create(name, AVAILABLE_FEATURES);
}

target('FeatureToggle', () => {
  describe('生成する', () => {
    // UT-CF-159
    context('有効なFeatureNameとtrueを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const featureName = createFeatureName('agentLessonCollection');

        // Act
        const actual = new FeatureToggle({ name: featureName, enabled: true });

        // Assert
        expect(actual.name.equals(featureName)).toBe(true);
        expect(actual.enabled).toBe(true);
      });
    });

    // UT-CF-160
    context('enabled=falseを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const featureName = createFeatureName('cascadeUpdate');

        // Act
        const actual = new FeatureToggle({ name: featureName, enabled: false });

        // Assert
        expect(actual.enabled).toBe(false);
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-161
    context('nameとenabledが同じ場合', () => {
      it('等しい', () => {
        // Arrange
        const featureName = createFeatureName('agentLessonCollection');
        const left = new FeatureToggle({ name: featureName, enabled: true });
        const right = new FeatureToggle({ name: featureName, enabled: true });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-162
    context('enabledが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const featureName = createFeatureName('agentLessonCollection');
        const left = new FeatureToggle({ name: featureName, enabled: true });
        const right = new FeatureToggle({ name: featureName, enabled: false });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-CF-163
    context('nameが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new FeatureToggle({
          name: createFeatureName('agentLessonCollection'),
          enabled: true,
        });
        const right = new FeatureToggle({
          name: createFeatureName('cascadeUpdate'),
          enabled: true,
        });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('状態を切り替える', () => {
    // UT-CF-164
    context('falseからtrueへtoggleする場合', () => {
      it('新インスタンスを返す', () => {
        // Arrange
        const featureName = createFeatureName('agentLessonCollection');
        const featureToggle = new FeatureToggle({
          name: featureName,
          enabled: false,
        });

        // Act
        const actual = featureToggle.toggle(true);

        // Assert
        expect(actual.enabled).toBe(true);
        expect(actual).not.toBe(featureToggle);
        expect(actual.name.equals(featureToggle.name)).toBe(true);
      });
    });

    // UT-CF-165
    context('同じ状態を指定する場合', () => {
      it('それでも新インスタンスを返す', () => {
        // Arrange
        const featureName = createFeatureName('agentLessonCollection');
        const featureToggle = new FeatureToggle({
          name: featureName,
          enabled: true,
        });

        // Act
        const actual = featureToggle.toggle(true);

        // Assert
        expect(actual.enabled).toBe(true);
        expect(actual).not.toBe(featureToggle);
      });
    });
  });
});
