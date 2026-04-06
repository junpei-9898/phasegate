// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ExitCodeSpec } from '../../../harness-api/domain/value-objects/exit-code-spec.js';

target('ExitCodeSpec', () => {
  describe('正常系: 有効な引数でExitCodeSpecを生成する', () => {
    // UT-ECS-001
    it('pass=0, fail=1, error=2でExitCodeSpecが生成されること', () => {
      // Arrange
      const input = { pass: 0, fail: 1, error: 2 };
      // Act
      const actual = ExitCodeSpec.create(input);
      // Assert
      expect(actual.pass).toBe(0);
      expect(actual.fail).toBe(1);
      expect(actual.error).toBe(2);
    });

    // UT-ECS-002
    it('standard()でpass=0,fail=1,error=2のExitCodeSpecが生成されること', () => {
      // Arrange / Act
      const actual = ExitCodeSpec.standard();
      // Assert
      expect(actual.pass).toBe(0);
      expect(actual.fail).toBe(1);
      expect(actual.error).toBe(2);
    });
  });

  context('pass が 0 でない場合', () => {
    // UT-ECS-003
    it('pass=1ではエラーをthrowすること', () => {
      // Arrange
      const input = { pass: 1, fail: 2, error: 3 };
      // Act
      const actual = () => ExitCodeSpec.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
