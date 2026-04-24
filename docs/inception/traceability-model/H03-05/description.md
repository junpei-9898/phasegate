# H03-05: WorkItem frontmatter の L2 metadata validator 統合（ISSUE-026 Phase A-3）

@story-id H03-05
概要: H03-04 で追加した `parseWorkItemFrontmatter` を L2 metadata validator 経路に接続し、malformed frontmatter を commit 前に検出する。

- **Epic**: H-03 Traceability Model
- **上位 Issue**: ISSUE-026
- **先行 US**: H03-04（`WorkItemFrontmatter` parser）
- **スコープ**: Phase A-3 の最小統合（well-formed 検証のみ）
- **優先度**: Must
- **着手日**: 2026-04-24

## 本ストーリーで実施すること

1. `DesignDocumentPort` に `readWorkItemFrontmatter(filePath)` optional member を追加
2. `MarkdownDesignDocumentGateway` に `readWorkItemFrontmatter` を実装
3. `ValidateDesignStoryAnnotationsUseCase` が `readWorkItemFrontmatter` を呼び、`WorkItemFrontmatterValidationError` を `L2-002` の `MetadataValidationOutput.errors` に変換
4. ユニットテスト UT-TM-WV01〜WV04 を追加

## 本ストーリーで実施しないこと

- WI frontmatter の**存在強制**（design doc すべてが WI frontmatter を持つ必要はない）
- 新 L2 validator コード（既存 L2-002 の傘下で処理）
- WI frontmatter の値検証ロジック（parser 側で完結済み）
- migration / physical layout 変更（→ Phase B）

## 関連文書

- [ISSUE-026](/Users/jumpei/dev/PhaseGate/docs/inception/issues/ISSUE-026/issue_description.md)
- [H03-04 logical_design.md](/Users/jumpei/dev/PhaseGate/docs/inception/traceability-model/H03-04/logical_design.md)
- [validate-design-story-annotations-usecase.ts](/Users/jumpei/dev/PhaseGate/scripts/harness/traceability-model/application/usecases/validate-design-story-annotations-usecase.ts)
- [markdown-design-document-gateway.ts](/Users/jumpei/dev/PhaseGate/scripts/harness/traceability-model/infrastructure/gateways/markdown-design-document-gateway.ts)
