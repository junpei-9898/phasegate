// @layer test
// @unit validator-system
// @story H08-01

import { describe, it, expect } from 'vitest';

describe('ValidTestClass', () => {
  describe('正常系', () => {
    it('有効な値を渡すとtrueが返ること', () => {
      // Arrange
      const input = 'valid';

      // Act
      const actual = input.length > 0;

      // Assert
      expect(actual).toBe(true);
    });
  });
});
