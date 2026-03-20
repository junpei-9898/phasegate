# スキル品質監査レポート

**監査日**: 2026-03-14
**対象**: 全24スキル
**監査観点**: 情報凝集度、内部矛盾、スキル間整合性、セクション完全性

---

## サマリー

| 評価 | スキル数 | 内訳 |
|------|---------|------|
| 🔴 重大問題あり | 4 | story-implementor, implementation-planner, implementation-readiness-checker, unit-designer |
| 🟡 要修正 | 14 | 「2フェーズ」見出し矛盾、参照エージェント不在、テンプレート不足等 |
| 🟢 問題なし | 6 | product-architect, domain-designer, logical-designer, cascade-updater, consistency-checker, codex-delegator |

---

## 1. システム横断の共通問題

### 1.1 見出し「2フェーズ」vs 本文「3フェーズ」矛盾（14スキル）

**影響度: HIGH** — エージェントが正しいプロセスを判断できない

モデルルーティング導入時に本文を3フェーズに更新したが、セクション見出し `## ⚠️ 2フェーズ実行ルール` が未更新。

**該当スキル:**
- story-writer, unit-designer, story-mapper, mock-designer
- environment-designer, scenario-test-designer
- unit-test-designer, it-test-designer
- unit-test-logic-designer, it-test-logic-designer, scenario-test-logic-designer
- test-coverage-checker, implementation-planner
- implementation-readiness-checker（※このスキルはフェーズ構造自体も不完全）

**修正方針:** 見出しを `## ⚠️ 3フェーズ実行ルール` に統一

---

### 1.2 存在しないエージェント/スキルへの参照（5スキル）

**影響度: HIGH** — 次ステップ誘導が無効になる

以下のスキルが `model-routing.md` に記載されていないエージェントを参照している:

| スキル | 参照エージェント | 状態 |
|--------|---------------|------|
| unit-test-designer | `unit-test-generator`, `model-tdd-executor` | ❌ 不在 |
| it-test-designer | `it-test-creator`, `it-tdd-executor` | ❌ 不在 |
| unit-test-logic-designer | `model-tdd-executor` | ❌ 不在 |
| it-test-logic-designer | `it-tdd-executor` | ❌ 不在 |
| scenario-test-logic-designer | `scenario-test-tdd-executor` | ❌ 不在 |

**修正方針:** これらの参照を `story-implementor`（TDD実装担当）に統一するか、該当エージェントを新規定義する

---

## 2. スキル別詳細（重大問題のみ）

### 2.1 🔴 story-implementor（317行）

**問題1: AIDLC Step番号の誤記**
- L28: 「AIDLC Step 8に対応」と記載
- frontmatter/L9: 「Step 2.3-2.7」と記載
- model-routing.md: Step 2.3-2.7 が正
- → L28の「Step 8」は誤記

**問題2: ファイルパス誤記**
- L94: `docs/inception/{unit}/{story_id}/uiux_design.md` と参照
- uiux-designer出力先: `docs/product/construction/{unit}/uiux_design.md`
- → パスが不一致

**問題3: Step 0の位置づけが曖昧**
- L122-175: 「Step 0: 前提条件の自動検証」がPhase 1内に含まれている
- 2フェーズ宣言と矛盾（実質3フェーズ構造）
- Phase 0（自動検証）→ Phase 1（計画）→ Phase 2（実装）の3段階に整理すべき

---

### 2.2 🔴 implementation-planner（155行）

**問題1: Phase 1/2セクションが完全に欠落**
- 3フェーズ宣言しているにもかかわらず、Phase 1/2のセクションがない
- 代わりに「ワークフロー」セクション（Step 1-6）が存在
- Phase 3（レビュー）のみが独立セクションとして存在
- → ワークフローとフェーズの関係が不明確

**問題2: Sonnet委任プロトコルと不整合**
- model-routing.md: Sonnet委任スキルはPhase 1（計画→承認）→ Phase 2（Sonnet実行）→ Phase 3（Opusレビュー）
- 本スキル: Phase 1/2が存在せず、Sonnet委任の手順が定義されていない

**問題3: 次ステップセクション欠落**

---

### 2.3 🔴 implementation-readiness-checker（251行）

**問題1: 2つの異なる責務が混在（低凝集）**
- 本来のモード: 実装開始前のファイル存在チェック（ゲートキーパー）
- 追加モード: 既存実装に対するテスト追加分析（L154-209）
- 2つのモードが独立した説明になっており、フェーズとの対応関係が不明確

**問題2: フェーズ構造が不完全**
- Phase 1/2/3は存在するが、本体のStep 1-3（L37-69）との関連性が不透明
- どのモードに対するフェーズなのか明記されていない

---

### 2.4 🔴 unit-designer（158行）

**問題1: Phase 2セクションが大幅に不完全**
- 出力ファイルの構成テンプレートがない（他の同類スキルにはある）
- Phase 2完了条件がない
- Sonnetに委任する際に必要な情報（期待フォーマット、テンプレート）が不足

---

## 3. 中程度の問題

### 3.1 🟡 出力ファイルテンプレート不足（4スキル）

| スキル | 不足内容 |
|--------|---------|
| unit-designer | Unit定義・統合契約テンプレート欠落 |
| story-writer | Phase 2出力ファイルの構成例が軽微に不足 |
| mock-designer | HTMLモック出力のテンプレート例なし |
| environment-designer | `environment_contract.md` の詳細テンプレートなし |

**影響:** Sonnet委任時にプロンプト情報が不足し、出力品質にばらつきが出る

---

### 3.2 🟡 次ステップセクション欠落（5スキル）

- story-mapper
- cascade-updater
- consistency-checker
- implementation-planner
- story-implementor

**影響:** スキル完了後のワークフロー遷移が不明確

---

### 3.3 🟡 test-coverage-checker のモード混在

- 本体: テストカバレッジ検証（3フェーズ）
- 追加セクション: 「実装済みコードへのテスト追加モード」（L323-415）
- 後付けで追加されたモードが3フェーズプロセスに統合されていない

---

### 3.4 🟡 参照ファイル存在未確認（2スキル）

| スキル | 参照ファイル | 確認状況 |
|--------|------------|---------|
| kimunii-perspective | `references/domain-model.md`, `references/glossary.md` | 未確認 |
| skill-creator | `references/workflows.md`, `references/output-patterns.md` | 未確認 |

---

## 4. 修正優先度マトリクス

| 優先度 | 対象 | 修正内容 | 影響範囲 |
|--------|------|---------|---------|
| **P0** | 14スキル | 見出し「2フェーズ」→「3フェーズ」統一 | 全Sonnet委任スキル |
| **P0** | implementation-planner | Phase 1/2セクション追加、ワークフローとの関係明確化 | Sonnet委任プロトコル |
| **P0** | story-implementor | Step番号誤記修正、ファイルパス修正、Step 0構造整理 | TDD実装フロー |
| **P1** | 5スキル | 参照エージェント名を `story-implementor` に統一 | テスト設計→実装遷移 |
| **P1** | implementation-readiness-checker | 2モードの責務分離、フェーズ構造の明確化 | 実装ゲートキーパー |
| **P1** | unit-designer | Phase 2テンプレート・完了条件の追加 | Sonnet委任品質 |
| **P2** | 4スキル | 出力ファイルテンプレート追加 | Sonnet委任品質 |
| **P2** | 5スキル | 次ステップセクション追加 | ワークフロー遷移 |
| **P2** | test-coverage-checker | 追加モードの3フェーズ統合 | スキル凝集性 |
| **P3** | 2スキル | 参照ファイル存在確認 | 実行時エラー防止 |

---

## 5. 品質スコア一覧

| スキル | 矛盾 | 凝集性 | フェーズ | テンプレ | 参照 | 総合 |
|--------|------|--------|---------|---------|------|------|
| product-architect | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 A |
| domain-designer | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 A |
| logical-designer | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 A |
| cascade-updater | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 A |
| consistency-checker | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 A |
| codex-delegator | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 A |
| uiux-designer | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🟢 A- |
| kimunii-perspective | ✅ | ✅ | N/A | N/A | ⚠️ | 🟢 A- |
| scenario-test-designer | ❌ | ✅ | ✅ | ✅ | ✅ | 🟡 B+ |
| story-writer | ❌ | ✅ | ✅ | ⚠️ | ✅ | 🟡 B |
| unit-test-designer | ❌ | ✅ | ✅ | ✅ | ❌ | 🟡 B |
| it-test-designer | ❌ | ✅ | ✅ | ✅ | ❌ | 🟡 B |
| unit-test-logic-designer | ❌ | ✅ | ✅ | ✅ | ❌ | 🟡 B |
| it-test-logic-designer | ❌ | ✅ | ✅ | ✅ | ❌ | 🟡 B |
| scenario-test-logic-designer | ❌ | ✅ | ✅ | ✅ | ❌ | 🟡 B |
| story-mapper | ❌ | ✅ | ✅ | ✅ | ✅ | 🟡 B |
| mock-designer | ❌ | ✅ | ✅ | ⚠️ | ✅ | 🟡 B |
| environment-designer | ❌ | ✅ | ✅ | ⚠️ | ✅ | 🟡 B |
| test-coverage-checker | ❌ | ⚠️ | ✅ | ✅ | ✅ | 🟡 B- |
| skill-creator | ✅ | ✅ | N/A | ⚠️ | ⚠️ | 🟡 B- |
| unit-designer | ❌ | ✅ | ✅ | ❌ | ✅ | 🔴 C |
| story-implementor | ❌ | ✅ | ⚠️ | ✅ | ❌ | 🔴 C |
| implementation-planner | ❌ | ❌ | ❌ | ✅ | ✅ | 🔴 D |
| implementation-readiness-checker | ❌ | ❌ | ❌ | ✅ | ✅ | 🔴 D |
