// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { LayerName } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';
import { LayerBoundary } from '../../../biome-ast-engine/domain/value-objects/layer-boundary.js';

const createLayerName = (value: 'domain' | 'application' | 'infrastructure' | 'presentation') =>
  LayerName.fromString(value);

const createLayerBoundary = (overrides?: {
  readonly sourceLayer?: LayerName;
  readonly targetLayer?: LayerName;
  readonly allowed?: boolean;
}): LayerBoundary =>
  LayerBoundary.create({
    sourceLayer: overrides?.sourceLayer ?? createLayerName('application'),
    targetLayer: overrides?.targetLayer ?? createLayerName('domain'),
    allowed: overrides?.allowed ?? true,
  });

target('LayerBoundary.create', () => {
  describe('レイヤー境界を生成する', () => {
    context('正常なsourceLayer/targetLayer/allowedの場合', () => {
      it('LayerBoundaryが生成される', () => {
        // Arrange
        const sourceLayer = createLayerName('application');
        const targetLayer = createLayerName('domain');
        const allowed = true;

        // Act
        const actual = LayerBoundary.create({ sourceLayer, targetLayer, allowed });

        // Assert
        expect(actual.allows(sourceLayer, targetLayer)).toBe(true);
      });
    });

    context('sourceLayerとtargetLayerが同一の場合', () => {
      it('同一レイヤー境界も生成できることを確認する', () => {
        // Arrange
        const sourceLayer = createLayerName('domain');
        const targetLayer = createLayerName('domain');
        const allowed = true;

        // Act
        const actual = LayerBoundary.create({ sourceLayer, targetLayer, allowed });

        // Assert
        expect(actual.allows(sourceLayer, targetLayer)).toBe(true);
      });
    });
  });
});

target('LayerBoundary.standardMatrix', () => {
  describe('正規依存行列を生成する', () => {
    it('横断契約に準拠した行列が返される', () => {
      // Arrange

      // Act
      const actual = LayerBoundary.standardMatrix();

      // Assert
      expect(actual).toHaveLength(16);
      const members = new Set(
        actual.flatMap((boundary) => [
          boundary.sourceLayer.toString(),
          boundary.targetLayer.toString(),
        ])
      );
      expect(members).toEqual(
        new Set(['domain', 'application', 'infrastructure', 'presentation'])
      );
    });

    it('domainからの外向き依存がすべてallowed=falseである', () => {
      // Arrange

      // Act
      const actual = LayerBoundary.standardMatrix();

      // Assert
      const outwardBoundaries = actual.filter(
        (boundary) =>
          boundary.sourceLayer.toString() === 'domain' &&
          boundary.targetLayer.toString() !== 'domain'
      );
      expect(outwardBoundaries.every((boundary) => boundary.allowed === false)).toBe(true);
    });

    it('applicationからdomainへの依存がallowed=trueである', () => {
      // Arrange

      // Act
      const actual = LayerBoundary.standardMatrix();

      // Assert
      const boundary = actual.find(
        (item) =>
          item.sourceLayer.toString() === 'application' &&
          item.targetLayer.toString() === 'domain'
      );
      expect(boundary?.allowed).toBe(true);
    });

    it('infrastructureからdomainへの依存がallowed=trueである', () => {
      // Arrange

      // Act
      const actual = LayerBoundary.standardMatrix();

      // Assert
      const boundary = actual.find(
        (item) =>
          item.sourceLayer.toString() === 'infrastructure' &&
          item.targetLayer.toString() === 'domain'
      );
      expect(boundary?.allowed).toBe(true);
    });

    it('infrastructureからpresentationへの依存がallowed=falseである', () => {
      // Arrange

      // Act
      const actual = LayerBoundary.standardMatrix();

      // Assert
      const boundary = actual.find(
        (item) =>
          item.sourceLayer.toString() === 'infrastructure' &&
          item.targetLayer.toString() === 'presentation'
      );
      expect(boundary?.allowed).toBe(false);
    });
  });
});

target('LayerBoundary.allows', () => {
  describe('依存方向の許可を判定する', () => {
    context('許可された依存方向の場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createLayerBoundary({
          sourceLayer: createLayerName('application'),
          targetLayer: createLayerName('domain'),
          allowed: true,
        });

        // Act
        const actual = sut.allows(createLayerName('application'), createLayerName('domain'));

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('禁止された依存方向の場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createLayerBoundary({
          sourceLayer: createLayerName('domain'),
          targetLayer: createLayerName('application'),
          allowed: false,
        });

        // Act
        const actual = sut.allows(createLayerName('domain'), createLayerName('application'));

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('LayerBoundary.equals', () => {
  describe('等価性を判定する', () => {
    context('同一属性のLayerBoundaryの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createLayerBoundary();
        const right = createLayerBoundary();

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
