import { SuiteId } from '../../domain/value-objects/suite-id.js';
import { RegressionSuiteDefinition } from '../../domain/value-objects/regression-suite-definition.js';
import { KRequirementTest } from '../../domain/value-objects/k-requirement-test.js';

export class KRequirementsSuiteDefinition {
  static get(): RegressionSuiteDefinition {
    const testCases = [
      KRequirementTest.create({ kNumber: 'K1', targetUnit: 'validator-system', verificationCondition: 'ValidatorIdRegistryが正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K2', targetUnit: 'phase-dependency-model', verificationCondition: 'PhaseGateResultの3層構造が正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K3', targetUnit: 'biome-ast-engine', verificationCondition: 'Biome AST解析結果が正しく返されること' }),
      KRequirementTest.create({ kNumber: 'K3.5', targetUnit: 'traceability-model', verificationCondition: 'メタデータ仕様が正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K4', targetUnit: 'validator-system', verificationCondition: 'テスト品質要件が満たされること' }),
      KRequirementTest.create({ kNumber: 'K5', targetUnit: 'validator-system', verificationCondition: 'DDDスキル要件が満たされること' }),
      KRequirementTest.create({ kNumber: 'K6', targetUnit: 'harness-api', verificationCondition: '2フェーズ実行が正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K7', targetUnit: 'harness-api', verificationCondition: 'ドキュメント分割が正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K8', targetUnit: 'harness-api', verificationCondition: 'カスケード更新が正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K9', targetUnit: 'ci-governance', verificationCondition: 'エージェントレッスンが正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K10', targetUnit: 'harness-api', verificationCondition: 'セキュリティ・パフォーマンス要件が満たされること' }),
      KRequirementTest.create({ kNumber: 'K11', targetUnit: 'validator-system', verificationCondition: 'ドリフト検出が正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K12', targetUnit: 'validator-system', verificationCondition: '一貫性チェッカーが正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K13', targetUnit: 'config-foundation', verificationCondition: 'PresetIdRegistryが正しく動作すること' }),
      KRequirementTest.create({ kNumber: 'K14', targetUnit: 'phase-dependency-model', verificationCondition: 'フェーズ依存性要件が満たされること' }),
      KRequirementTest.create({ kNumber: 'K15', targetUnit: 'harness-api', verificationCondition: '計画ドキュメント要件が満たされること' }),
    ];

    return RegressionSuiteDefinition.create({
      suiteId: SuiteId.create('k-requirements'),
      testCases,
      description: 'K要件回帰テストスイート（K1〜K15）',
    });
  }
}
