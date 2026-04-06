// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { LayerReference } from '../../../traceability-model/domain/value-objects/layer-reference.js';

const createLayerReference = (layerName = 'domain'): LayerReference => LayerReference.parse(layerName);

target('LayerReference.parse', () => {
  describe('レイヤー名からLayerReferenceを生成する', () => {
    context('正規語彙domainを渡す場合', () => {
      it('valid=trueのLayerReferenceを返すこと', () => {
        // Arrange
        const input = 'domain';

        // Act
        const actual = LayerReference.parse(input);

        // Assert
        expect(actual.layerName).toBe('domain');
        expect(actual.valid).toBe(true);
      });
    });

    context('正規語彙applicationとinfrastructureとpresentationを渡す場合', () => {
      it('いずれもvalid=trueのLayerReferenceを返すこと', () => {
        // Arrange
        const inputs = Object.freeze(['application', 'infrastructure', 'presentation'] as const);

        // Act
        const actual = inputs.map((input) => LayerReference.parse(input));

        // Assert
        expect(actual.map((item) => item.valid)).toEqual([true, true, true]);
      });
    });

    context('legacy語彙usecaseを渡す場合', () => {
      it('valid=falseのLayerReferenceを返すこと', () => {
        // Arrange
        const input = 'usecase';

        // Act
        const actual = LayerReference.parse(input);

        // Assert
        expect(actual.layerName).toBe('usecase');
        expect(actual.valid).toBe(false);
      });
    });

    context('legacy語彙portとcontrollerを渡す場合', () => {
      it('いずれもvalid=falseのLayerReferenceを返すこと', () => {
        // Arrange
        const inputs = Object.freeze(['port', 'controller'] as const);

        // Act
        const actual = inputs.map((input) => LayerReference.parse(input));

        // Assert
        expect(actual.map((item) => item.valid)).toEqual([false, false]);
      });
    });

    context('正規語彙にもlegacy語彙にも属さない値を渡す場合', () => {
      it('valid=falseのLayerReferenceを返すこと', () => {
        // Arrange
        const input = 'adapter';

        // Act
        const actual = LayerReference.parse(input);

        // Assert
        expect(actual.layerName).toBe('adapter');
        expect(actual.valid).toBe(false);
      });
    });
  });
});

target('LayerReference.equals', () => {
  describe('2つのLayerReferenceの等価性を判定する', () => {
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createLayerReference('domain');
        const other = createLayerReference('domain');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
