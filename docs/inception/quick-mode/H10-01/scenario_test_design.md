# シナリオテスト設計: H10-01 — Quick Mode設定（harness.config.json quickModeセクション）

> **Unit ID**: quick-mode
> **ストーリーID**: H10-01
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

H10-01はCLIコマンドを直接所有しない。`harness:ci-check --quick` の内部処理として呼ばれる `JudgeQuickModeEligibilityUseCase` および `HarnessConfigQuickModeConfigAdapter` が主テスト対象。

- `HarnessConfigQuickModeConfigAdapter`: `harness.config.json` の `quickMode` セクションを読み取り、`QuickModeConfig` VOを生成
- `JudgeQuickModeEligibilityUseCase`: 変更ファイル群からQuick Mode適用可否を判定
- `QuickModeJudgmentEngine.classify()` / `.judge()`: 変更分類・3拒否ルール評価

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H10-01-001 | allowedCategories内のファイルのみの場合にeligible=trueを返す | ChangedFile[]（bugfix/docs/test/config のみ） | eligible=true、rejectionRule=undefined |
| SC-H10-01-002 | allowedCategories外（domain）のファイルが混在する場合に拒否される | ChangedFile[]（bugfix + domain混在） | eligible=false、rejectionRule=MIXED_CHANGES |
| SC-H10-01-003 | domain/配下に新規ファイル追加（CREATE）がある場合に拒否される | ChangedFile[]（domain/xxx.ts, CREATE） | eligible=false、rejectionRule=NEW_DOMAIN |
| SC-H10-01-004 | Port/Adapterインターフェースファイルの変更がある場合に拒否される | ChangedFile[]（*port.ts MODIFY） | eligible=false、rejectionRule=API_CONTRACT |
| SC-H10-01-005 | quickModeセクションなしのharness.config.jsonでデフォルト設定が適用される | harness.config.json（quickModeセクション省略） | allowedCategories=['bugfix','docs','test','config'] で動作 |
| SC-H10-01-006 | 空のChangedFile[]に対してeligible=trueを返す | changedFiles=[] | eligible=true |
| SC-H10-01-007 | MIXED_CHANGES → NEW_DOMAIN → API_CONTRACT の評価順序が固定されている | MIXED_CHANGES + NEW_DOMAIN 両方該当 | rejectionRule=MIXED_CHANGES（最初に一致） |

## 3. テスト配置
- ユニットテスト: `scripts/harness/__tests__/unit/quick-mode/domain/`
- 統合テスト: `scripts/harness/__tests__/integration/quick-mode/`

## 4. 前提条件
- `harness.config.json` のJSONスキーマバリデーション通過
- `HarnessConfigV2.quickMode` セクション定義が存在すること
