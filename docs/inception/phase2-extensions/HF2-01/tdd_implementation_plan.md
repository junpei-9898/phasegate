# TDD実装計画: HF2-01〜HF2-03 (phase2-extensions)

## 1. スコープ
- 対象ストーリー: HF2-01〜HF2-03
- 影響する層: Domain / Application / Infrastructure / Presentation
- CLI コマンド: `p2:check-freshness`, `p2:validate-pointers`, `p2:generate-e2e-template`

## 2. 前提条件検証
- `implementation-readiness-checker` 相当の検証: ✅ 全設計文書が正規AIDLCフローで作成・検証済み
- 判定結果: ✅ 実装準備完了

## 3. 実装状況

### 既存実装（前セッションで完了）
- ソースファイル: 35 .tsファイル（domain 15 / application 9 / infrastructure 5 / presentation 5 / composition-root 1）
- ユニットテスト: 9テストファイル
- 統合テスト: 10テストファイル
- E2Eテスト: ❌ 未実装
- 全テスト: PASS（91件中 phase2-extensions分 39件）

### 設計文書との整合性チェック

| 設計文書 | 整合性 |
|---------|--------|
| domain_model.md | ✅ 集約・VO・ドメインサービス・ポート全一致 |
| logical_design.md | ✅ kebab-caseファイル名、ディレクトリ構成一致 |
| unit_test_design.md (UT-P2-001〜065) | ✅ テストケース網羅 |
| it_test_design.md (IT-P2-001〜041) | ✅ テストケース網羅 |
| scenario_test_design.md (SC-P2-001〜010) | ❌ E2Eテスト未実装 |

## 4. TDD実装順序

### 1. Unitテスト → ✅ 完了（9ファイル）
### 2. ITテスト → ✅ 完了（10ファイル）
### 3. E2E/シナリオテスト → ❌ 未実装（対応必要）

SC-P2-001〜010のE2Eテストをcli-harness.test.tsに追加する。

## 5. 残作業
1. cli-harness.test.tsにphase2-extensions E2Eテスト10件追加
2. 全テストスイート実行・パス確認

## 6. QA
なし
