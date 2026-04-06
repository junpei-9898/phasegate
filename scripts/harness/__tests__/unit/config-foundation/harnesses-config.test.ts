// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HarnessesConfig } from '../../../config-foundation/domain/value-objects/harnesses-config.js';
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

target('HarnessesConfig', () => {
  describe('生成する', () => {
    // UT-CF-126
    context('全機能がfalseと0の場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        };

        // Act
        const actual = new HarnessesConfig(input);

        // Assert
        expect(actual.agentLessonCollection).toBe(false);
        expect(actual.cascadeUpdate).toBe(false);
        expect(actual.bundleSizeLimit).toBe(0);
        expect(actual.deadCodeGC).toBe(false);
      });
    });

    // UT-CF-127
    context('bundleSizeLimitが正値の場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 500,
          deadCodeGC: false,
        };

        // Act
        const actual = new HarnessesConfig(input);

        // Assert
        expect(actual.bundleSizeLimit).toBe(500);
      });
    });

    // UT-CF-129
    context('全機能がtrueと正値の場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          agentLessonCollection: true,
          cascadeUpdate: true,
          bundleSizeLimit: 500,
          deadCodeGC: true,
        };

        // Act
        const actual = new HarnessesConfig(input);

        // Assert
        expect(actual.agentLessonCollection).toBe(true);
        expect(actual.cascadeUpdate).toBe(true);
        expect(actual.bundleSizeLimit).toBe(500);
        expect(actual.deadCodeGC).toBe(true);
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-130
    context('全属性が同じ場合', () => {
      it('等しい', () => {
        // Arrange
        const props = {
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        };
        const left = new HarnessesConfig(props);
        const right = new HarnessesConfig(props);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-131
    context('bundleSizeLimitが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const base = {
          agentLessonCollection: false,
          cascadeUpdate: false,
          deadCodeGC: false,
        };
        const left = new HarnessesConfig({ ...base, bundleSizeLimit: 0 });
        const right = new HarnessesConfig({ ...base, bundleSizeLimit: 500 });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('機能を切り替える', () => {
    // UT-CF-132
    context('boolean機能をenableする場合', () => {
      it('trueの新インスタンスを返す', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('agentLessonCollection');

        // Act
        const actual = harnessesConfig.enable(featureName);

        // Assert
        expect(actual.agentLessonCollection).toBe(true);
        expect(actual).not.toBe(harnessesConfig);
      });
    });

    // UT-CF-133
    context('bundleSizeLimitが0の状態でenableする場合', () => {
      it('500になる', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('bundleSizeLimit');

        // Act
        const actual = harnessesConfig.enable(featureName);

        // Assert
        expect(actual.bundleSizeLimit).toBe(500);
      });
    });

    // UT-CF-134
    context('bundleSizeLimitが既に正値の場合', () => {
      it('値を維持する', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 300,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('bundleSizeLimit');

        // Act
        const actual = harnessesConfig.enable(featureName);

        // Assert
        expect(actual.bundleSizeLimit).toBe(300);
      });
    });

    // UT-CF-135
    context('boolean機能をdisableする場合', () => {
      it('falseの新インスタンスを返す', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: true,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('agentLessonCollection');

        // Act
        const actual = harnessesConfig.disable(featureName);

        // Assert
        expect(actual.agentLessonCollection).toBe(false);
        expect(actual).not.toBe(harnessesConfig);
      });
    });

    // UT-CF-136
    context('bundleSizeLimitをdisableする場合', () => {
      it('0になる', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 500,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('bundleSizeLimit');

        // Act
        const actual = harnessesConfig.disable(featureName);

        // Assert
        expect(actual.bundleSizeLimit).toBe(0);
      });
    });

    // UT-CF-194 (境界値)
    context('bundleSizeLimitが無効境界値0の場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        };

        // Act
        const actual = new HarnessesConfig(input);

        // Assert
        const featureName = createFeatureName('bundleSizeLimit');
        expect(actual.isEnabled(featureName)).toBe(false);
      });
    });

    // UT-CF-195 (境界値)
    context('bundleSizeLimitが有効最小値1の場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 1,
          deadCodeGC: false,
        };

        // Act
        const actual = new HarnessesConfig(input);

        // Assert
        const featureName = createFeatureName('bundleSizeLimit');
        expect(actual.isEnabled(featureName)).toBe(true);
      });
    });

  });

  describe('機能状態を判定する', () => {
    // UT-CF-137
    context('boolean機能が有効の場合', () => {
      it('trueを返す', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: true,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('agentLessonCollection');

        // Act
        const actual = harnessesConfig.isEnabled(featureName);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-138
    context('boolean機能が無効の場合', () => {
      it('falseを返す', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('cascadeUpdate');

        // Act
        const actual = harnessesConfig.isEnabled(featureName);

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-CF-139
    context('bundleSizeLimitが正値の場合', () => {
      it('trueを返す', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 500,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('bundleSizeLimit');

        // Act
        const actual = harnessesConfig.isEnabled(featureName);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-140
    context('bundleSizeLimitが0の場合', () => {
      it('falseを返す', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        });
        const featureName = createFeatureName('bundleSizeLimit');

        // Act
        const actual = harnessesConfig.isEnabled(featureName);

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-CF-197 (境界値)
    context('全機能がデフォルト無効値の場合', () => {
      it('すべてfalseを返す', () => {
        // Arrange
        const harnessesConfig = new HarnessesConfig({
          agentLessonCollection: false,
          cascadeUpdate: false,
          bundleSizeLimit: 0,
          deadCodeGC: false,
        });
        const featureNames = AVAILABLE_FEATURES.map((name) => createFeatureName(name));

        // Act
        const actual = featureNames.map((featureName) =>
          harnessesConfig.isEnabled(featureName)
        );

        // Assert
        expect(actual).toEqual([false, false, false, false]);
      });
    });
  });
});
