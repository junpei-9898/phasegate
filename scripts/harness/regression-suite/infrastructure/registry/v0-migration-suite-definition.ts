import { SuiteId } from '../../domain/value-objects/suite-id.js';
import { RegressionSuiteDefinition } from '../../domain/value-objects/regression-suite-definition.js';
import { KRequirementTest } from '../../domain/value-objects/k-requirement-test.js';

export class V0MigrationSuiteDefinition {
  static get(): RegressionSuiteDefinition {
    // v0-migration suite uses K requirement tests as placeholder
    // In real usage, this would be populated from MigrationMapping repository
    const testCases = [
      KRequirementTest.create({
        kNumber: 'K1',
        targetUnit: 'regression-suite',
        verificationCondition: 'v0テスト移行マッピングが正しく管理されること',
      }),
    ];

    return RegressionSuiteDefinition.create({
      suiteId: SuiteId.create('v0-migration'),
      testCases,
      description: 'v0テスト移行スイート（H15-02 CIゲート化）',
    });
  }
}
