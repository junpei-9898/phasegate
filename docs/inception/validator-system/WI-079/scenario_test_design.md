# シナリオテスト設計: H08-01 — L2 test-qualityバリデータ

> **Unit ID**: validator-system
> **ストーリーID**: H08-01
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

`RunValidatorsHandler` 経由でL2 test-qualityバリデータ（validatorId: L2-003）を実行する機能。

- AAAパターン（Arrange/Act/Assert）構造の検証
- テスト変数の `actual` 命名規約の検証
- single-act（1テストケース1アクション）の検証
- no-domain-mock（ドメイン層のモック禁止）の検証
- E2E seed pattern（テストデータのシード方式）の検証
- describe/it命名規約の検証
- 各ルール違反時のHarnessError（L2-003）に `fix_example` を含める

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-VS-01-001 | RunValidatorsHandlerが全UseCase passの場合 | layer='all', unit='validator-system', phase='implementation' | exitCode=0、output出力あり |
| SC-VS-01-002 | --format ci指定時 | format='ci', layer='all' | JSON形式のoutput、exitCode=0 |
| SC-VS-01-003 | --format agent指定時 | format='agent' | agent形式のoutput、exitCode=0 |
| SC-VS-01-004 | UseCase実行エラー時 | UseCaseがValidatorExecutionErrorをthrow | exitCode=2、エラーメッセージ含むoutput |
| SC-VS-01-005 | バリデーション失敗（failedValidators > 0）時 | failedValidators=2 | exitCode=1 |

## 3. テスト配置
- `scripts/harness/__tests__/integration/validator-system/handlers/run-validators-handler.test.ts`
- `scripts/harness/__tests__/unit/validator-system/validator-id.test.ts`
- `scripts/harness/__tests__/unit/validator-system/validation-rule.test.ts`
- `scripts/harness/__tests__/unit/validator-system/validator-registry.test.ts`
- `scripts/harness/__tests__/unit/validator-system/validator-execution-service.test.ts`

## 4. 前提条件
- `HarnessConfigV2` がconfig-foundationから取得可能であること
- `biome-ast-engine` のL1結果が参照可能であること
- テスト対象ファイルが `targetPaths` で指定されていること
