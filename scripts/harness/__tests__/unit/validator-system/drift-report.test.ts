/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it } from 'vitest';
import { target, context, createDriftReport } from '../../helpers/test-helpers.js';
import { DriftReport } from '../../../validator-system/domain/value-objects/drift-report.js';

target('DriftReport', () => {

  describe('有効なフィールドからDriftReportを生成する', () => {

    it('direction: design→codeで全フィールド有効なDriftReportが生成されること (UT-DRP-001)', () => {
      // Arrange & Act
      const actual = DriftReport.create({
        direction: 'design→code',
        unitName: 'validator-system',
        element: 'ValidatorId',
        description: '設計に存在するがコードに存在しない',
      });
      // Assert
      expect(actual).toBeDefined();
      expect(actual.direction).toBe('design→code');
    });

    it('direction: code→designで全フィールド有効なDriftReportが生成されること (UT-DRP-002)', () => {
      // Arrange & Act
      const actual = DriftReport.create({
        direction: 'code→design',
        unitName: 'validator-system',
        element: 'ValidatorId',
        description: 'コードに存在するが設計に存在しない',
      });
      // Assert
      expect(actual.direction).toBe('code→design');
    });
  });

  context('無効なdirectionが渡された場合', () => {

    it('direction: invalid-directionを渡すとエラーがthrowされること (UT-DRP-003/UT-BND-015/INV-10)', () => {
      // Arrange
      const input = {
        direction: 'invalid-direction' as 'design→code',
        unitName: 'validator-system',
        element: 'ValidatorId',
        description: '無効方向',
      };
      // Act
      const actual = () => DriftReport.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  describe('toHarnessError()でHarnessErrorを返す', () => {

    it('direction: design→codeのDriftReportのtoHarnessError()がcode: L4-001のHarnessErrorを返すこと (UT-DRP-004)', () => {
      // Arrange
      const sut = DriftReport.create({
        direction: 'design→code',
        unitName: 'validator-system',
        element: 'ValidatorId',
        description: '設計に存在するがコードに存在しない',
      });
      // Act
      const actual = sut.toHarnessError();
      // Assert
      expect(actual.code.toString()).toBe('L4-001');
    });

    it('direction: code→designのDriftReportのtoHarnessError()がcode: L4-001のHarnessErrorを返すこと (UT-DRP-005)', () => {
      // Arrange
      const sut = DriftReport.create({
        direction: 'code→design',
        unitName: 'validator-system',
        element: 'SomeEntity',
        description: 'コードに存在するが設計に存在しない',
      });
      // Act
      const actual = sut.toHarnessError();
      // Assert
      expect(actual.code.toString()).toBe('L4-001');
    });
  });

  describe('equals()で同値比較を行う', () => {

    it('全フィールドが同一の2つのDriftReportのequals()がtrueを返すこと (UT-DRP-006)', () => {
      // Arrange
      const a = createDriftReport();
      const b = createDriftReport();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    it('directionフィールドが異なる2つのDriftReportのequals()がfalseを返すこと (UT-DRP-007)', () => {
      // Arrange
      const a = createDriftReport({ direction: 'design→code' });
      const b = createDriftReport({ direction: 'code→design' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });

    it('elementフィールドが異なる2つのDriftReportのequals()がfalseを返すこと (UT-DRP-008)', () => {
      // Arrange
      const a = createDriftReport({ element: 'ValidatorId' });
      const b = createDriftReport({ element: 'ValidatorDefinition' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
