// @unit regression-suite
// @layer infrastructure
// @story H14-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { StaticSuiteRegistryAdapter } from '../../../regression-suite/infrastructure/adapters/static-suite-registry-adapter.js';
import { SuiteId } from '../../../regression-suite/domain/value-objects/suite-id.js';
import { KRequirementTest } from '../../../regression-suite/domain/value-objects/k-requirement-test.js';
import { GngConditionTest } from '../../../regression-suite/domain/value-objects/gng-condition-test.js';
import { AgentIndependenceTest } from '../../../regression-suite/domain/value-objects/agent-independence-test.js';

target('StaticSuiteRegistryAdapter（実体レジストリ）', () => {
  // IT-ADP-SuiteRegistry-001
  describe("getDefinition: SuiteId('k-requirements') に KRequirementTest[] を含む定義を返すこと", () => {
    context('k-requirements を要求する場合', () => {
      it('suiteId.value=k-requirements・testCases が K1〜K15（16 件）の KRequirementTest であること', async () => {
        // Arrange
        const adapter = new StaticSuiteRegistryAdapter();

        // Act
        const actual = await adapter.getDefinition(SuiteId.create('k-requirements'));

        // Assert
        expect(actual.suiteId.value).toBe('k-requirements');
        expect(actual.testCases).toHaveLength(16);
        expect(actual.testCases[0]).toBeInstanceOf(KRequirementTest);
      });
    });
  });

  // IT-ADP-SuiteRegistry-002
  describe("getDefinition: SuiteId('gng-gate') に GngConditionTest 3 件（GNG-4/5/8）を返すこと", () => {
    context('gng-gate を要求する場合', () => {
      it('testCases が GngConditionTest[] 3 件で gngNumber が GNG-4/GNG-5/GNG-8 であること', async () => {
        // Arrange
        const adapter = new StaticSuiteRegistryAdapter();

        // Act
        const actual = await adapter.getDefinition(SuiteId.create('gng-gate'));

        // Assert
        expect(actual.testCases).toHaveLength(3);
        expect(actual.testCases[0]).toBeInstanceOf(GngConditionTest);
        const gngNumbers = actual.testCases.map((tc) => (tc as GngConditionTest).gngNumber).sort();
        expect(gngNumbers).toEqual(['GNG-4', 'GNG-5', 'GNG-8']);
      });
    });
  });

  // IT-ADP-SuiteRegistry-003
  describe("getDefinition: SuiteId('agent-independence') に forbiddenPatterns を持つ定義を返すこと", () => {
    context('agent-independence を要求する場合', () => {
      it('testCases が AgentIndependenceTest[] で各要素の forbiddenPatterns が 1 件以上であること', async () => {
        // Arrange
        const adapter = new StaticSuiteRegistryAdapter();

        // Act
        const actual = await adapter.getDefinition(SuiteId.create('agent-independence'));

        // Assert
        expect(actual.testCases[0]).toBeInstanceOf(AgentIndependenceTest);
        for (const tc of actual.testCases) {
          expect((tc as AgentIndependenceTest).forbiddenPatterns.length).toBeGreaterThanOrEqual(1);
        }
      });
    });
  });

  // IT-ADP-SuiteRegistry-004
  describe("getDefinition: SuiteId('v0-migration') に定義を返すこと", () => {
    context('v0-migration を要求する場合', () => {
      it('suiteId.value=v0-migration・testCases が 1 件以上であること', async () => {
        // Arrange
        const adapter = new StaticSuiteRegistryAdapter();

        // Act
        const actual = await adapter.getDefinition(SuiteId.create('v0-migration'));

        // Assert
        expect(actual.suiteId.value).toBe('v0-migration');
        expect(actual.testCases.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
