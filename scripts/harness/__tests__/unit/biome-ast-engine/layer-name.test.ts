import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { LayerName } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';

const createLayerName = (value = 'domain'): LayerName => LayerName.fromString(value);

target('LayerName.fromString', () => {
  describe('正規レイヤー名を生成する', () => {
    context('"domain"を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'domain';

        // Act
        const actual = LayerName.fromString(input);

        // Assert
        expect(actual.toPathSegment()).toBe('domain');
      });
    });

    context('"application"を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'application';

        // Act
        const actual = LayerName.fromString(input);

        // Assert
        expect(actual.toPathSegment()).toBe('application');
      });
    });

    context('"infrastructure"を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'infrastructure';

        // Act
        const actual = LayerName.fromString(input);

        // Assert
        expect(actual.toPathSegment()).toBe('infrastructure');
      });
    });

    context('"presentation"を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'presentation';

        // Act
        const actual = LayerName.fromString(input);

        // Assert
        expect(actual.toPathSegment()).toBe('presentation');
      });
    });

  });
});

target('LayerName.canDependOn', () => {
  describe('レイヤー依存方向を検証する', () => {
    context('domainがapplicationに依存する場合', () => {
      it('falseを返す', () => {
        // Arrange
        const source = createLayerName('domain');
        const targetLayer = createLayerName('application');

        // Act
        const actual = source.canDependOn(targetLayer);

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('applicationがdomainに依存する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const source = createLayerName('application');
        const targetLayer = createLayerName('domain');

        // Act
        const actual = source.canDependOn(targetLayer);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('LayerName.toPathSegment', () => {
  describe('レイヤー名をパスセグメントとして返す', () => {
    context('domainの場合', () => {
      it('"domain"が返される', () => {
        // Arrange
        const sut = createLayerName('domain');

        // Act
        const actual = sut.toPathSegment();

        // Assert
        expect(actual).toBe('domain');
      });
    });
  });
});
