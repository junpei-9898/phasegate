import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { SuiteId } from '../../../../regression-suite/domain/value-objects/suite-id.js';
import { RegressionSuiteDefinition } from '../../../../regression-suite/domain/value-objects/regression-suite-definition.js';
import { KRequirementTest } from '../../../../regression-suite/domain/value-objects/k-requirement-test.js';
import { GngConditionTest } from '../../../../regression-suite/domain/value-objects/gng-condition-test.js';

const createSuiteId = (v: 'k-requirements' | 'gng-gate' | 'v0-migration' | 'agent-independence' = 'k-requirements') =>
  SuiteId.create(v);
const createKRequirementTest = (kNumber = 'K1') =>
  KRequirementTest.create({ kNumber, targetUnit: 'validator-system', verificationCondition: '正しく動作すること' });
const createGngConditionTest = () =>
  GngConditionTest.create({ gngNumber: 'GNG-4', targetUnit: 'harness-api', verificationCondition: '条件が満たされること' });

target('RegressionSuiteDefinition', () => {
  // UT-RS-030
  describe('create: 有効なsuiteId・testCases 1件・description で生成する場合', () => {
    it('正常に生成される', () => {
      // Arrange
      const suiteId = createSuiteId('k-requirements');
      const testCases = [createKRequirementTest()];
      // Act
      const actual = RegressionSuiteDefinition.create({ suiteId, testCases, description: 'K要件テスト' });
      // Assert
      expect(actual.suiteId.value).toBe('k-requirements');
      expect(actual.testCases).toHaveLength(1);
    });
  });

  // UT-RS-031
  describe('create: testCases に複数のKRequirementTest を渡す場合', () => {
    it('正常に生成される', () => {
      // Arrange
      const testCases = [
        createKRequirementTest('K1'),
        createKRequirementTest('K2'),
        createKRequirementTest('K3'),
      ];
      // Act
      const actual = RegressionSuiteDefinition.create({ suiteId: createSuiteId(), testCases, description: 'desc' });
      // Assert
      expect(actual.testCases).toHaveLength(3);
    });
  });

  // UT-RS-032
  describe('create: testCases=[] の場合（INV-6）', () => {
    it('EmptyTestCasesError をスロー', () => {
      expect(() =>
        RegressionSuiteDefinition.create({ suiteId: createSuiteId(), testCases: [], description: 'desc' })
      ).toThrow('EmptyTestCasesError');
    });
  });

  // UT-RS-033
  describe('create: testCases が空配列（INV-6 重複確認）', () => {
    it('EmptyTestCasesError をスロー', () => {
      expect(() =>
        RegressionSuiteDefinition.create({ suiteId: createSuiteId(), testCases: [], description: 'desc' })
      ).toThrow('EmptyTestCasesError');
    });
  });

  // UT-RS-034
  describe('immutable: 生成後にtestCasesの変更が反映されない', () => {
    it('変更が反映されない（ReadonlyArray）', () => {
      // Arrange
      const definition = RegressionSuiteDefinition.create({
        suiteId: createSuiteId(),
        testCases: [createKRequirementTest()],
        description: 'desc',
      });
      const originalLength = definition.testCases.length;
      // Act
      try {
        (definition.testCases as unknown[]).push(createKRequirementTest('K15'));
      } catch (_) { /* no-op */ }
      // Assert
      expect(definition.testCases.length).toBe(originalLength);
    });
  });

  // UT-RS-035
  describe('equals: 同一suiteId/testCasesを持つ2つのRegressionSuiteDefinition を比較する場合', () => {
    it('等価（値等価性）', () => {
      // Arrange
      const a = RegressionSuiteDefinition.create({ suiteId: createSuiteId(), testCases: [createKRequirementTest()], description: 'desc' });
      const b = RegressionSuiteDefinition.create({ suiteId: createSuiteId(), testCases: [createKRequirementTest()], description: 'desc' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });
  });

  // UT-RS-036
  describe('equals: 異なるsuiteIdを持つ2つのRegressionSuiteDefinition を比較する場合', () => {
    it('非等価', () => {
      // Arrange
      const a = RegressionSuiteDefinition.create({ suiteId: createSuiteId('k-requirements'), testCases: [createKRequirementTest()], description: 'desc' });
      const b = RegressionSuiteDefinition.create({ suiteId: createSuiteId('gng-gate'), testCases: [createGngConditionTest()], description: 'desc' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
