# シナリオテスト設計: H08-06 — L4 dead-codeバリデータ

> **Unit ID**: validator-system
> **ストーリーID**: H08-06
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

L4 dead-codeバリデータ（L4-003）の実行機能。

- 未使用エクスポート（exportされているが他ファイルからimportされていない）の検出
- 到達不能コード（条件分岐で到達し得ないブロック）の検出
- 検出時のHarnessError（L4-003）に `adr_ref` + `fix_example` + 対象ファイルパス・行番号を含める
- strictプリセットでのみ有効（deadCodeGC機能としてharness.config.jsonで制御）

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-VS-06-001 | strictプリセットで未使用エクスポートなしの場合 | preset='strict', 全エクスポートが使用済み | passed=true |
| SC-VS-06-002 | strictプリセットで未使用エクスポートを検出する場合 | preset='strict', 未使用exportあり | passed=false、HarnessError(L4-003)にファイルパス・行番号を含む |
| SC-VS-06-003 | strictプリセットで到達不能コードを検出する場合 | preset='strict', return後のコードブロックあり | passed=false、HarnessError(L4-003)にadr_ref+fix_exampleを含む |
| SC-VS-06-004 | standardプリセット時にdead-codeチェックをスキップする場合 | preset='standard' | dead-codeバリデータが無効化され、チェックなし |
| SC-VS-06-005 | RunFullValidationUseCaseで全レイヤーを一括実行する場合 | includeL4=true | L2/L3/L4全バリデータが実行される |
| SC-VS-06-006 | RunFullValidationUseCaseでnoL4=trueの場合 | includeL4=false | L4バリデータがスキップされる |

## 3. テスト配置
- `scripts/harness/__tests__/integration/validator-system/usecases/run-l4-validators-usecase.test.ts`
- `scripts/harness/__tests__/integration/validator-system/usecases/run-full-validation-usecase.test.ts`
- `scripts/harness/__tests__/unit/validator-system/dead-code-report.test.ts`
- `scripts/harness/__tests__/unit/validator-system/dead-code-detection-service.test.ts`

## 4. 前提条件
- `SourceAnalysisPort` が実装されていること（ImportGraphSourceAnalysisAdapter）
- `HarnessConfigV2` からPreset情報（deadCodeGC設定）が取得可能であること
- biome-ast-engineのImportGraph解析結果が参照可能であること
