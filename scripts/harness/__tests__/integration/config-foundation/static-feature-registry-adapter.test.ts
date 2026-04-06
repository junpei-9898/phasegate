// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StaticFeatureRegistryAdapter } from '../../../config-foundation/infrastructure/registries/static-feature-registry-adapter.js';

target('StaticFeatureRegistryAdapter', () => {
  describe('listAvailable', () => {
    context('Wave 1対象機能を取得する場合', () => {
      it('IT-CF-051: 固定順の4機能を返すこと', () => {
        // Arrange
        const adapter = new StaticFeatureRegistryAdapter();

        // Act
        const actual = adapter.listAvailable();

        // Assert
        expect(actual).toEqual([
          'agentLessonCollection',
          'cascadeUpdate',
          'bundleSizeLimit',
          'deadCodeGC',
        ]);
      });
    });

    context('複数回呼び出す場合', () => {
      it('IT-CF-052: 常に同じ並び順を返すこと', () => {
        // Arrange
        const adapter = new StaticFeatureRegistryAdapter();

        // Act
        const actual = [adapter.listAvailable(), adapter.listAvailable()];

        // Assert
        expect(actual[0]).toEqual(actual[1]);
      });
    });

    context('返却値を書き換えようとする場合', () => {
      it('IT-CF-053: 内部配列が破壊されないこと', () => {
        // Arrange
        const adapter = new StaticFeatureRegistryAdapter();
        const first = [...adapter.listAvailable()];
        first.splice(0, 1);

        // Act
        const actual = adapter.listAvailable();

        // Assert
        expect(actual).toEqual([
          'agentLessonCollection',
          'cascadeUpdate',
          'bundleSizeLimit',
          'deadCodeGC',
        ]);
      });
    });
  });
});
