---
id: WI-238
type: chore
severity: normal
affects: [docs]
---

# WI-238: skill 構造適合の底上げ（実在見出しの反ロンダリング正規化）

> 起票日: 2026-07-07
> 経緯: skill-quality H12-06-AC-2/AC-3 の実コーパス適合プローブ（WI-235）で全 30 スキル中の一部が必須 7 セクション未適合と判明していた。本 WI は **反ロンダリングを最優先原則**として、セクションのコンテンツが実在するスキルに限り、バリデータ認識形の見出しへ正規化（リネーム／実在コンテンツ直上への見出し付与）し、適合を 19/30 → 23/30 へ底上げする。セクションが本質的に存在しないスキルは捏造せず未適合のまま据え置く。

## 反ロンダリング原則（本 WI の絶対制約）

- バリデータ認識形の見出しは、その節のコンテンツが**真に存在する**場合にのみ付与・リネームする。
- 適合を通すためにセクション本文を**捏造しない**。真に欠落するスキルは未適合のまま（記録し、隠さない）。
- 編集対象は `skills/*/SKILL.md`（見出しの正規化）と本 tracking doc、`coverage_report.md`（訂正注記のみ）、`package.json` のみ。バリデータ本体（`skill-structure-validator.ts` 等）・`phasegate.config.json`・acBoundStories は一切変更しない。

## 実施内容（本 WI で landed）

### flip（4 スキル、7/7 適合へ）

- **implementation-planner**: intro に `## 目的`／`## 参照ドキュメント`→`## 入力（参照ドキュメント）`（WI/Unit/domain-model 参照表）／`## Pre-flight check (BLOCKING)`→`## 前提条件チェック（Pre-flight, BLOCKING）`／Step 6 出力の上に `## 出力ファイル`。`## ⚠️ 3フェーズ実行ルール` は既存で認識済み。
- **quick-implementor**: intro に `## 目的`／`### 適用可能な変更カテゴリ`→`### 入力（適用可能な変更カテゴリ）`／`## ワークフロー`→`## 実行フロー`／`### Step 5: コミット`→`### 出力（Step 5: コミット）`／`### 適用除外（…）`→`### 前提条件（適用除外・フルハーネス必須 → story-implementor を使用）`。**注**: `## 適用条件チェック（必須）` は H10-04-AC-2 が SKILL.md に要求する固定文言のためリネームせず維持し、前提条件は真正な除外ゲート小節で担保した。
- **codebase-mapper**: `## 目的`／`## 入力`（sourceDir 配下 `**/*.ts`・`@unit`/`@layer`・import グラフ）／`## 前提条件`（sourceDir 設定・アノテーション付与）を実在コンテンツから正規化。`## 出力物`・`## ⚠️ 2フェーズ実行ルール` は既存で認識済み。
- **doc-freshness-checker**: `## 目的`／`## 入力`（`--dir`/`constructionDir`・`--threshold`/`docFreshnessThresholds`・git 履歴）。`## 前提条件`・`## ⚠️ 2フェーズ実行ルール`・`### 出力フォーマット` は既存で認識済み。

### 部分正規化（未適合のまま据え置き）

- **codex-delegator**: `## 目的`／`## 入力`（委任タスク＋設計文書）／`## 前提`→`## 前提条件`／Phase 1/2 の実在フローに `## ⚠️ 2フェーズ実行ルール` を付与。**outputs は据え置き**（委任成果物は可変で固有の出力セクションを持たないため捏造しない）→ 未適合。
- **pointer-validator** / **implementation-readiness-checker**: `## 目的`＋`## 入力`（真正な入力アーティファクトがあるもの）。prerequisites/executionFlow は本質的に希薄／単一フェーズのため据え置き → 未適合。
- **phasegate-config-doctor**: `## 目的`＋`## 入力`（Step 1 の診断対象ファイル群は真正な入力アーティファクト）。outputs/prerequisites/executionFlow は据え置き → 未適合。
- **phasegate-toolkit-guide** / **engineering-perspective** / **skill-creator**: `## 目的`（skill-creator は英語 `## Purpose`）のみ。入力はユーザー質問（アーティファクトでない）、outputs/prerequisites/executionFlow は advisory/read-only/thinking-framework/reference の性質上存在しないため捏造せず据え置き → 未適合。

### ドキュメント

- `docs/product/construction/skill-quality/coverage_report.md` §H12-06 に WI-238 の適合プローブ更新注記を追記（19/30 → 23/30、flip した 4 スキルと未適合 7 スキルを列挙）。**カバー行のフリップ・サマリ % の変更は一切行っていない**。
- 本 tracking doc の作成。

## スコープ外 / 据え置き

- **H12-06-AC-2/AC-3 は 未カバー のまま**。全 30 スキルが適合したわけではない（7 スキルが真に未適合）ため、実コーパス適合テストは現状も red となる。強制 green は laundering に当たるため行わない。未適合 7 スキルの outputs/prerequisites/executionFlow の扱いは、taxonomy（スキル種別ごとの必須セクション定義）または AC 判断を要する別課題として据え置く。
- バリデータ本体・`phasegate.config.json`・acBoundStories・`docs/principles/` は一切変更しない。

## 検証

- 本番パス（`FileSystemSkillFileReaderAdapter` + `SkillStructureValidator`）での throwaway プローブ → **CONFORMING: 23/30**（プローブ成果物は未コミット）。
- `npm run test` green（baseline 4127）。H10-04 quick-implementor アーティファクト適合テストの固定文言（`## 適用条件チェック（必須）`）は維持。
- 反ロンダリング: 実在コンテンツの見出し正規化のみ。捏造セクションなし。未適合スキルは coverage_report と本 doc に正直に列挙。
