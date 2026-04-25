# シナリオテスト設計: H07-02 — phase-gate ACマッピング完了チェック追加

> **Unit ID**: nyquist-validation
> **ストーリーID**: H07-02
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

`AcCoverageGatePolicy` による ACマッピング完了判定機能（validator-systemのphase-gateバリデータが実行）。

- requirement-test-matrix.jsonに未マッピングのACが存在する場合、`AcCoverageGatePolicy` が fail を返す
- 全ACがマッピング済みの場合、`AcCoverageGatePolicy` が pass を返す
- phase-gate失敗時のHarnessErrorに未マッピングAC一覧を含める
- validator-systemの `NyquistAcCoveragePolicyAdapter` 経由でポリシーを消費

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-NQ-02-001 | 全ACがマッピング済みの場合 | storyMappings に全AC分のacMappings | passed=true |
| SC-NQ-02-002 | 未マッピングのACがある場合 | AC-3 がacMappingsに存在しない | passed=false、未マッピングAC一覧（AC-3）を含むHarnessError |
| SC-NQ-02-003 | storyMappingsが空の場合 | storyMappings=[] | passed=true（マッピング対象なし） |
| SC-NQ-02-004 | NyquistAcCoveragePolicyAdapterがポリシーを正しく委譲する場合 | validator-systemからAdapterを経由して実行 | AcCoveragePolicyGateのresultが正しくvalidator-systemに伝達される |

## 3. テスト配置
- `scripts/harness/__tests__/unit/nyquist-validation/ac-coverage-gate-policy.test.ts`
- `scripts/harness/__tests__/integration/validator-system/adapters/nyquist-ac-coverage-policy-adapter.test.ts`

## 4. 前提条件
- `RequirementTestMatrix` 集約が正しく初期化されていること
- `AcCoverageGatePolicy` が `scripts/harness/nyquist-validation/domain/services/ac-coverage-gate-policy.ts` に実装されていること
- validator-systemの `AcCoveragePolicyPort` に対してAdapterが実装されていること
