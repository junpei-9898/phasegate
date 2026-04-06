// @layer test
import { describe, expect, it } from 'vitest';
import { target, context, createTestReference, createAcMapping } from '../../helpers/test-helpers.js';
import { AcMapping } from '../../../nyquist-validation/domain/value-objects/ac-mapping.js';
import { InvalidAcIdFormatError } from '../../../nyquist-validation/domain/errors/invalid-ac-id-format-error.js';

target('AcMapping', () => {

  describe('生成テスト', () => {
    // UT-ACM-001
    it('acId=AC-1 と TestReference 1件でインスタンスが生成されること', () => {
      // Arrange
      const ref = createTestReference();
      // Act
      const actual = AcMapping.create({ acId: 'AC-1', testReferences: [ref] });
      // Assert
      expect(actual.acId).toBe('AC-1');
      expect(actual.testReferences).toHaveLength(1);
    });

    // UT-ACM-002
    it('testReferencesが空配列のとき未カバー状態でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = AcMapping.create({ acId: 'AC-1', testReferences: [] });
      // Assert
      expect(actual.testReferences).toHaveLength(0);
      expect(actual.isCovered()).toBe(false);
    });

    // UT-ACM-003
    it('acId=AC-100（3桁正整数）でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = AcMapping.create({ acId: 'AC-100', testReferences: [] });
      // Assert
      expect(actual.acId).toBe('AC-100');
    });
  });

  describe('制約テスト（acId形式）', () => {
    // UT-ACM-004
    it('acId=AC-0（ゼロ）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC-0', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-005
    it('acId=AC-01（ゼロパディング）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC-01', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-006
    it('acId=ac-1（小文字）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'ac-1', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-007
    it('acId=AC1（ハイフンなし）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC1', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-008
    it('acId=AC-（数字なし）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC-', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-009
    it('acId=AC--1（負数）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC--1', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });
  });

  describe('等値性テスト', () => {
    // UT-ACM-010
    it('同一acId・同一testReferencesのとき equals が true を返すこと', () => {
      // Arrange
      const ref = createTestReference();
      const acm1 = AcMapping.create({ acId: 'AC-1', testReferences: [ref] });
      const acm2 = AcMapping.create({ acId: 'AC-1', testReferences: [ref] });
      // Act
      const actual = acm1.equals(acm2);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-ACM-011
    it('異なるacIdのとき equals が false を返すこと', () => {
      // Arrange
      const ref = createTestReference();
      const acm1 = AcMapping.create({ acId: 'AC-1', testReferences: [ref] });
      const acm2 = AcMapping.create({ acId: 'AC-2', testReferences: [ref] });
      // Act
      const actual = acm1.equals(acm2);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-ACM-012
    it('同一acId・異なるtestReferencesのとき equals が false を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/harness/__tests__/unit/a.test.ts' });
      const ref2 = createTestReference({ filePath: 'scripts/harness/__tests__/unit/b.test.ts' });
      const acm1 = AcMapping.create({ acId: 'AC-1', testReferences: [ref1] });
      const acm2 = AcMapping.create({ acId: 'AC-1', testReferences: [ref2] });
      // Act
      const actual = acm1.equals(acm2);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('振る舞いテスト（isCovered）', () => {
    // UT-ACM-013
    it('testReferencesが1件あるとき isCovered が true を返すこと', () => {
      // Arrange
      const sut = createAcMapping('AC-1', [createTestReference()]);
      // Act
      const actual = sut.isCovered();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-ACM-014
    it('testReferencesが空配列のとき isCovered が false を返すこと', () => {
      // Arrange
      const sut = createAcMapping('AC-1', []);
      // Act
      const actual = sut.isCovered();
      // Assert
      expect(actual).toBe(false);
    });
  });
});
