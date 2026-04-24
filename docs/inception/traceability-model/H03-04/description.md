# H03-04: WorkItem frontmatter parser 追加（ISSUE-026 Phase A-2）

@story-id H03-04
概要: 設計文書先頭の YAML frontmatter から WI メタデータ（`id` / `type` / `affects` / `severity` / `status` / `source` / `legacy_id`）を抽出する parser を traceability-model infrastructure 層に追加する。

- **Epic**: H-03 Traceability Model
- **上位 Issue**: ISSUE-026
- **先行 US**: H02-04（`@work-item-id` annotation parser 併存対応）
- **スコープ**: Phase A-2 の 2 要素（parser / validator 統合）のうち **parser のみ** を切り出す
- **優先度**: Must
- **着手日**: 2026-04-24

## ISSUE-026 文面からの逸脱点

ISSUE-026 には「WI frontmatter の JSON schema を config-foundation に追加」とあるが、以下の理由で **traceability-model に配置**する:

1. frontmatter 解析は既に `traceability-model/infrastructure/parsers/frontmatter-flag-parser.ts` に存在（凝集）
2. config-foundation は `phasegate.config.json` の処理を担当（design doc frontmatter はスコープ外）
3. L2 metadata validator (`@story-id` / `@issue-id` 統合) は traceability-model 内 → 後続の validator 統合も同 Unit 内で閉じる

## 本ストーリーで実施すること

1. `WorkItemFrontmatter` 型を domain 層に追加（value object 相当・string ベースで型を表現）
2. `parseWorkItemFrontmatter` を infrastructure 層に追加
3. `WorkItemFrontmatterValidationError` を追加（型不正・enum 違反）
4. ユニットテスト UT-TM-W01〜W10 を追加

## 本ストーリーで実施しないこと

- L2 metadata validator への統合（→ H03-05 で対応予定）
- 既存 `parseFrontmatterFlags` の書き換え（後方互換維持）
- `@work-item-id` アノテーション検出との連動（→ 別 US）
- WI state machine (`DRAFTED → REFLECTED → IMPLEMENTED → TESTED`) の自動更新（→ Phase C 以降）

## 関連文書

- [ISSUE-026](/Users/jumpei/dev/PhaseGate/docs/inception/issues/ISSUE-026/issue_description.md)
- [H02-04 logical_design.md](/Users/jumpei/dev/PhaseGate/docs/inception/phase-dependency-model/H02-04/logical_design.md)
- [frontmatter-flag-parser.ts](/Users/jumpei/dev/PhaseGate/scripts/harness/traceability-model/infrastructure/parsers/frontmatter-flag-parser.ts)
