// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  InvalidRequiredInputError,
  RequiredInput,
} from '../../../biome-ast-engine/domain/value-objects/required-input.js';

const createRequiredInput = (value = 'source-module-snapshots'): RequiredInput =>
  RequiredInput.fromString(value);

target('RequiredInput.fromString', () => {
  describe('ルール評価に必要な入力種別を生成する', () => {
    context('未定義の入力種別を指定した場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const input = 'unknown-input';

        // Act
        const actual = () => RequiredInput.fromString(input);

        // Assert
        expect(actual).toThrow(InvalidRequiredInputError);
      });
    });
  });
});

target('RequiredInput.equals', () => {
  describe('同一入力種別の等価性を判定する', () => {
    context('同じ入力種別の場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createRequiredInput('import-graph');
        const right = createRequiredInput('import-graph');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
