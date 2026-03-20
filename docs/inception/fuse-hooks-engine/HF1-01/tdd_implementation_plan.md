# TDD実装計画: HF1-01〜HF1-05 (fuse-hooks-engine)

## 1. スコープ
- 対象ストーリー: HF1-01〜HF1-05
- 影響する層: Domain / Application / Infrastructure / Presentation
- CLI コマンド: `hooks:config`, `hooks:gate-check`

## 2. 前提条件検証
- `implementation-readiness-checker` 相当の検証: ✅ 全設計文書が正規AIDLCフローで作成・検証済み
- 判定結果: ✅ 実装準備完了

## 3. 実装状況

### 既存実装（前セッションで完了）
- ソースファイル: 54 .tsファイル（domain 25 / application 10 / infrastructure 7 / presentation 4 / composition-root 1）
- ユニットテスト: 12テストファイル（48テスト）
- 統合テスト: 2テストファイル（4テスト）
- E2Eテスト: ❌ 未実装
- 全テスト: PASS（91件中 fuse-hooks-engine分 52件）

### 設計文書との整合性チェック

| 設計文書 | 整合性 |
|---------|--------|
| domain_model.md | ✅ 集約・エンティティ・VO・ドメインサービス・ポート全一致 |
| logical_design.md | ✅ kebab-caseファイル名、ディレクトリ構成一致 |
| unit_test_design.md (UT-HF-001〜094) | ✅ テストケース網羅 |
| it_test_design.md (IT-HF-001〜040) | ✅ テストケース網羅 |
| scenario_test_design.md (SC-HF-001〜006) | ❌ E2Eテスト未実装 |

## 4. TDD実装順序

### 1. Unitテスト → ✅ 完了（12ファイル）
### 2. ITテスト → ✅ 完了（2ファイル）
### 3. E2E/シナリオテスト → ❌ 未実装（対応必要）

SC-HF-001〜006のE2Eテストをcli-harness.test.tsに追加する。

## 5. 残作業
1. cli-harness.test.tsにfuse-hooks-engine E2Eテスト6件追加
2. 全テストスイート実行・パス確認

## 6. QA
なし
