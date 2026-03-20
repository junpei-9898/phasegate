import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  RuleName,
} from '../../../biome-ast-engine/domain/value-objects/rule-name.js';

const createRuleName = (value = 'require-unit-comment'): RuleName => RuleName.fromString(value);

target('RuleName.equals', () => {
  describe('同一ルール名の等価性を判定する', () => {
    context('同じルール名の場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createRuleName('require-unit-comment');
        const right = createRuleName('require-unit-comment');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('異なるルール名の場合', () => {
      it('falseを返す', () => {
        // Arrange
        const left = createRuleName('require-unit-comment');
        const right = createRuleName('require-layer-comment');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('RuleName.isMetadataRule', () => {
  describe('メタデータ関連ルールを判別する', () => {
    context('require-unit-commentの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createRuleName('require-unit-comment');

        // Act
        const actual = sut.isMetadataRule();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('no-layer-violationの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createRuleName('no-layer-violation');

        // Act
        const actual = sut.isMetadataRule();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('RuleName.isImportGraphRule', () => {
  describe('importグラフ依存ルールを判別する', () => {
    context('no-layer-violationの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createRuleName('no-layer-violation');

        // Act
        const actual = sut.isImportGraphRule();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
