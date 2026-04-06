// @layer infrastructure
import { SuiteId } from '../../domain/value-objects/suite-id.js';
import { RegressionSuiteDefinition } from '../../domain/value-objects/regression-suite-definition.js';
import { GngConditionTest } from '../../domain/value-objects/gng-condition-test.js';

export class GngGateSuiteDefinition {
  static get(): RegressionSuiteDefinition {
    const testCases = [
      GngConditionTest.create({ gngNumber: 'GNG-4', targetUnit: 'harness-api', verificationCondition: 'YOLO/skip-permissionsフラグが使用されないこと' }),
      GngConditionTest.create({ gngNumber: 'GNG-5', targetUnit: 'harness-api', verificationCondition: '2フェーズ実行が実施されていること' }),
      GngConditionTest.create({ gngNumber: 'GNG-8', targetUnit: 'harness-api', verificationCondition: 'デフォルトオフ機能が守られていること' }),
    ];

    return RegressionSuiteDefinition.create({
      suiteId: SuiteId.create('gng-gate'),
      testCases,
      description: 'GNGゲート回帰テストスイート（GNG-4/GNG-5/GNG-8）',
    });
  }
}
