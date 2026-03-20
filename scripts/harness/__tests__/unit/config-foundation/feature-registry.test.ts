import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FeatureRegistry } from '../../../config-foundation/domain/services/feature-registry.js';
import type { FeatureRegistryPort } from '../../../config-foundation/domain/ports/feature-registry-port.js';
import { UnsupportedFeatureError } from '../../../config-foundation/domain/errors/unsupported-feature-error.js';

function createFeatureRegistryPort(
  names: readonly string[],
): FeatureRegistryPort {
  return {
    listAvailable(): readonly string[] {
      return names;
    },
  };
}

function createFeatureRegistry(): FeatureRegistry {
  return new FeatureRegistry();
}

target('FeatureRegistry', () => {
  describe('listAvailable', () => {
    // UT-CF-183
    context('重複を含む一覧が返る場合', () => {
      it('重複を除去する', () => {
        // Arrange
        const featureRegistry = createFeatureRegistry();
        const featureRegistryPort = createFeatureRegistryPort([
          'agentLessonCollection',
          'agentLessonCollection',
          'cascadeUpdate',
        ]);

        // Act
        const actual = featureRegistry.listAvailable(featureRegistryPort);

        // Assert
        expect(actual.map((featureName) => featureName.toString())).toEqual([
          'agentLessonCollection',
          'cascadeUpdate',
        ]);
      });
    });

    // UT-CF-184
    context('未ソートの一覧が返る場合', () => {
      it('安定ソートする', () => {
        // Arrange
        const featureRegistry = createFeatureRegistry();
        const featureRegistryPort = createFeatureRegistryPort([
          'deadCodeGC',
          'agentLessonCollection',
          'bundleSizeLimit',
        ]);

        // Act
        const actual = featureRegistry.listAvailable(featureRegistryPort);

        // Assert
        expect(actual.map((featureName) => featureName.toString())).toEqual([
          'agentLessonCollection',
          'bundleSizeLimit',
          'deadCodeGC',
        ]);
      });
    });

    // UT-CF-185
    context('空配列が返る場合', () => {
      it('空配列を返す', () => {
        // Arrange
        const featureRegistry = createFeatureRegistry();
        const featureRegistryPort = createFeatureRegistryPort([]);

        // Act
        const actual = featureRegistry.listAvailable(featureRegistryPort);

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  describe('ensureAvailable', () => {
    // UT-CF-186
    context('存在する機能名を指定する場合', () => {
      it('FeatureNameを返す', () => {
        // Arrange
        const featureRegistry = createFeatureRegistry();
        const featureRegistryPort = createFeatureRegistryPort([
          'agentLessonCollection',
          'cascadeUpdate',
          'bundleSizeLimit',
          'deadCodeGC',
        ]);

        // Act
        const actual = featureRegistry.ensureAvailable(
          'agentLessonCollection',
          featureRegistryPort,
        );

        // Assert
        expect(actual.toString()).toBe('agentLessonCollection');
      });
    });

    // UT-CF-187
    context('存在しない機能名を指定する場合', () => {
      it('エラーになる', () => {
        // Arrange
        const featureRegistry = createFeatureRegistry();
        const featureRegistryPort = createFeatureRegistryPort([
          'agentLessonCollection',
          'cascadeUpdate',
          'bundleSizeLimit',
          'deadCodeGC',
        ]);

        // Act
        const actual = () =>
          featureRegistry.ensureAvailable('unknownFeature', featureRegistryPort);

        // Assert
        expect(actual).toThrowError(UnsupportedFeatureError);
        expect(actual).toThrowError(/L1-004/);
      });
    });

    // UT-CF-188
    context('存在しない機能名を指定する場合', () => {
      it('エラーメッセージに利用可能一覧を含める', () => {
        // Arrange
        const featureRegistry = createFeatureRegistry();
        const featureRegistryPort = createFeatureRegistryPort([
          'agentLessonCollection',
          'cascadeUpdate',
          'bundleSizeLimit',
          'deadCodeGC',
        ]);

        // Act
        const actual = () =>
          featureRegistry.ensureAvailable('unknownFeature', featureRegistryPort);

        // Assert
        expect(actual).toThrowError(/agentLessonCollection/);
        expect(actual).toThrowError(/cascadeUpdate/);
        expect(actual).toThrowError(/bundleSizeLimit/);
        expect(actual).toThrowError(/deadCodeGC/);
      });
    });

    // UT-CF-189
    context('空文字を指定する場合', () => {
      it('エラーになる', () => {
        // Arrange
        const featureRegistry = createFeatureRegistry();
        const featureRegistryPort = createFeatureRegistryPort([
          'agentLessonCollection',
          'cascadeUpdate',
          'bundleSizeLimit',
          'deadCodeGC',
        ]);

        // Act
        const actual = () => featureRegistry.ensureAvailable('', featureRegistryPort);

        // Assert
        expect(actual).toThrowError(UnsupportedFeatureError);
        expect(actual).toThrowError(/L1-004/);
      });
    });
  });
});
