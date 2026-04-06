// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  RuleType,
} from '../../../biome-ast-engine/domain/value-objects/rule-type.js';

const createRuleType = (value = 'BiomeNative'): RuleType => RuleType.fromString(value);

target('RuleType.equals', () => {
  describe('同一実行経路の等価性を判定する', () => {
    context('同じRuleTypeの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createRuleType('BiomeNative');
        const right = createRuleType('BiomeNative');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
