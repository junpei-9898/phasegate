# H02-04: `@work-item-id` アノテーション併存対応（ISSUE-026 Phase A-1）

@story-id H02-04
概要: `FileSystemStoryReflectionAdapter` の annotation parser を拡張し、`@story-id` / `@issue-id` / `@work-item-id` を同一規約で認識する（後方互換維持）。

- **Epic**: H-02 Phase Dependency Model
- **上位 Issue**: ISSUE-026（inception の work item 表現が多系統併存しており、product 反映ゲートが機能不全を起こしている）
- **スコープ**: Phase A の 3 要素（スキーマ / validator / parser）のうち **parser 拡張のみ** を切り出す
- **優先度**: Must
- **着手日**: 2026-04-24

## 背景

ISSUE-026 で採用された work item (WI) 一本化方針では、product 文書での反映宣言を `@work-item-id WI-XXX` に統一する。ただし既存の全 product 文書は `@story-id H02-XX` / `@story-id H04-XX` 等の記法を持っており、段階的な移行期間中は `@story-id` / `@issue-id` / `@work-item-id` の 3 系統を **併存して認識**できる必要がある。

## 本ストーリーで実施すること

`FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation` の regex を拡張し、以下のアノテーションを全て検出対象とする:

- `@story-id US-001` / `@story-id H02-01`
- `@issue-id ISSUE-026`
- `@work-item-id WI-026`

さらにいずれの記法においても:

- カンマ / 空白区切りによる複数 ID の列挙
- HTML コメント（`<!-- @work-item-id WI-001 -->`）形式

を検出できるようにする。

## 本ストーリーで実施しないこと

- WI frontmatter JSON schema の追加（→ config-foundation 側の後続ストーリー）
- L2 metadata validator での frontmatter 検証（→ validator-system 側の後続ストーリー）
- 物理レイアウトの統一（`docs/inception/issues/` → `_cross/` 移動）（→ Phase B）
- `WriteTargetScope.fromPath` の分岐削除（→ Phase C）

## 関連文書

- [ISSUE-026](/Users/jumpei/dev/PhaseGate/docs/inception/issues/ISSUE-026/issue_description.md)
- [domain_model.md](/Users/jumpei/dev/PhaseGate/docs/product/construction/phase-dependency-model/domain_model.md)
- [logical_design.md](/Users/jumpei/dev/PhaseGate/docs/product/construction/phase-dependency-model/logical_design.md)
- [file-system-story-reflection-adapter.ts](/Users/jumpei/dev/PhaseGate/scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.ts)
