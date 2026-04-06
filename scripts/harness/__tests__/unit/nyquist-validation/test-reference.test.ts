// @layer test
import { describe, expect, it } from 'vitest';
import { target, context, createTestReference } from '../../helpers/test-helpers.js';
import { TestReference } from '../../../nyquist-validation/domain/value-objects/test-reference.js';
import { EmptyFilePathError } from '../../../nyquist-validation/domain/errors/empty-file-path-error.js';
import { InvalidTestTypeError } from '../../../nyquist-validation/domain/errors/invalid-test-type-error.js';

target('TestReference', () => {

  describe('生成テスト', () => {
    // UT-TR-001
    it('有効なfilePathとtestType=unit でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      // Assert
      expect(actual.filePath).toBe('scripts/foo.test.ts');
      expect(actual.testType).toBe('unit');
    });

    // UT-TR-002
    it('testType=it でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'it' });
      // Assert
      expect(actual.testType).toBe('it');
    });

    // UT-TR-003
    it('testType=scenario でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'scenario' });
      // Assert
      expect(actual.testType).toBe('scenario');
    });
  });

  describe('制約テスト（filePath）', () => {
    // UT-TR-004
    it('filePathが空文字のとき EmptyFilePathError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: '', testType: 'unit' });
      // Act / Assert
      expect(actual).toThrowError(EmptyFilePathError);
    });

    // UT-TR-005
    it('filePathがスペースのみのとき EmptyFilePathError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: '  ', testType: 'unit' });
      // Act / Assert
      expect(actual).toThrowError(EmptyFilePathError);
    });
  });

  describe('制約テスト（testType）', () => {
    // UT-TR-006
    it('testType=e2e のとき InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'e2e' });
      // Act / Assert
      expect(actual).toThrowError(InvalidTestTypeError);
    });

    // UT-TR-007
    it('testType=Unit（大文字）のとき InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'Unit' });
      // Act / Assert
      expect(actual).toThrowError(InvalidTestTypeError);
    });

    // UT-TR-008
    it('testTypeが空文字のとき InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: 'scripts/foo.test.ts', testType: '' });
      // Act / Assert
      expect(actual).toThrowError(InvalidTestTypeError);
    });

    // UT-TR-009
    it('testType=integration のとき InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'integration' });
      // Act / Assert
      expect(actual).toThrowError(InvalidTestTypeError);
    });
  });

  describe('等値性テスト', () => {
    // UT-TR-010
    it('同一filePath・同一testTypeのとき equals が true を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      // Act
      const actual = ref1.equals(ref2);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-TR-011
    it('異なるfilePath・同一testTypeのとき equals が false を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/bar.test.ts', testType: 'unit' });
      // Act
      const actual = ref1.equals(ref2);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-TR-012
    it('同一filePath・異なるtestTypeのとき equals が false を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'it' });
      // Act
      const actual = ref1.equals(ref2);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
