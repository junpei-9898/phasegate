import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FeatureName } from '../../../config-foundation/domain/value-objects/feature-name.js';

const AVAILABLE_FEATURES = [
  'agentLessonCollection',
  'cascadeUpdate',
  'bundleSizeLimit',
  'deadCodeGC',
] as const;

function createFeatureName(
  name: string,
  availableNames: readonly string[] = AVAILABLE_FEATURES
): FeatureName {
  return FeatureName.create(name, availableNames);
}

target('FeatureName', () => {
  describe('生成する', () => {
    // UT-CF-153
    context('利用可能一覧に含まれる名前を渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const availableNames = [...AVAILABLE_FEATURES];

        // Act
        const actual = createFeatureName('agentLessonCollection', availableNames);

        // Assert
        expect(actual.toString()).toBe('agentLessonCollection');
      });
    });

    // UT-CF-155
    context('全4機能名を渡す場合', () => {
      it('すべて生成できる', () => {
        // Arrange
        const names = [
          'agentLessonCollection',
          'cascadeUpdate',
          'bundleSizeLimit',
          'deadCodeGC',
        ];
        const availableNames = [...AVAILABLE_FEATURES];

        // Act
        const actual = names.map((name) => createFeatureName(name, availableNames));

        // Assert
        expect(actual).toHaveLength(4);
        actual.forEach((featureName, idx) => {
          expect(featureName.toString()).toBe(names[idx]);
        });
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-156
    context('同じ値を比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const left = createFeatureName('agentLessonCollection');
        const right = createFeatureName('agentLessonCollection');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-157
    context('異なる値を比較する場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = createFeatureName('agentLessonCollection');
        const right = createFeatureName('cascadeUpdate');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('文字列表現を返す', () => {
    // UT-CF-158
    context('bundleSizeLimitを保持する場合', () => {
      it('文字列を返す', () => {
        // Arrange
        const featureName = createFeatureName('bundleSizeLimit');

        // Act
        const actual = featureName.toString();

        // Assert
        expect(actual).toBe('bundleSizeLimit');
      });
    });
  });
});
