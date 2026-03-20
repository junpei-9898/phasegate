# テストカバレッジ計画: ci-governance
**作成日**: 2026-03-20

## 1. スコープ
- 対象: ci-governance unit（H13-01, H13-02, H13-03）

## 2. テストファイル構成

### カバレッジ目標

| レイヤー | カバレッジ目標 | 主なカバレッジ対象 |
|---------|-------------|----------------|
| Domain（VO・集約・ドメインサービス） | ≥90% | 不変条件、状態遷移、変換ルール |
| Application（UseCase） | ≥85% | 正常系・異常系・バリデーション |
| Infrastructure（Adapter） | ≥80% | ファイルI/O、外部Unit連携 |
| Presentation（Handler） | ≥80% | 引数解析、exitCode、出力フォーマット |

### 総テストケース数

| テスト種別 | ケース数 |
|-----------|---------|
| ユニットテスト（11ファイル） | 105件 |
| 統合テスト/UseCase（8ファイル） | 約30件 |
| 統合テスト/Adapter（4ファイル） | 約20件 |
| 統合テスト/Handler（3ファイル） | 約15件 |
| 統合テスト/Cross-Layer（3ファイル） | 約10件 |
| E2Eテスト（cli-harness.test.ts内） | 3件（ci:generate-template / ci:migrate-agents-md / ci:check-repetition） |

### E2Eテスト確認事項

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内 `ci-governance コマンド群` セクション:

| コマンド | 検証内容 |
|---------|---------|
| `ci:generate-template --preset default --type pull_request` | stderr に "Unknown command: ci:generate-template" を含まないこと |
| `ci:migrate-agents-md --dry-run` | stderr に "Unknown command: ci:migrate-agents-md" を含まないこと |
| `ci:check-repetition --code ERR-001` | stderr に "Unknown command: ci:check-repetition" を含まないこと |

## 3. QA
なし（遡及記録）
