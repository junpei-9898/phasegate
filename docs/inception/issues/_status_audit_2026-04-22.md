# Issue ステータス実地監査 — 2026-04-22（2026-04-23 更新）

## 2026-04-23 更新サマリ

| 変更 | 内容 |
|---|---|
| ISSUE-009 | 🔴 真に未解決 → 🟡 **DEFERRED**。Orchestration Engine との責務境界見直し（詳細は [ISSUE-009 issue_description.md](./ISSUE-009/issue_description.md)） |
| ISSUE-007 | Wave 9 (v0.74.0) 着地で acceptance 全 8 条件成立 → **2026-04-23 CLOSED** |
| ISSUE-003 | Wave 1〜4 完了。159 → **15 件**（v0.75.0〜v0.80.0）。残 15 件の内訳: L1-007 (1) + L1-006 (2) + L1-003 (12) — 全て別 issue に切り出し済み |
| ISSUE-014 | **新規起票**: アーキテクチャスタイルの config 対応（Clean 固定 → preset 選択式） |
| ISSUE-015 | **新規起票**: QuickModeJudgmentEngine に comment-only diff 検出を追加（ISSUE-003 Wave 2a 残余 1 件の自動解消） |
| ISSUE-016 | **新規起票** → **2026-04-23 CLOSED (v0.79.0)**: `no-layer-violation` (L1-003) の `ignorePatterns` 配線完了 |
| ISSUE-017 | **新規起票 → CLOSED (v0.83.0)**: `extractImports` に ExportDeclaration 対応 + 再帰走査追加。`changed-files-port.ts` ghost false positive 解消。副作用で barrel 経由の実アーキ違反 7 件が L1-003 に露出（8 → 15） |
| ISSUE-018 | **新規起票 → CLOSED (v0.81.0)**: `cli-executor-port.ts` を `application/ports/` に移動。L1-003: 12 → 9 |
| ISSUE-019 | **新規起票**: phasegate の LayerBoundary が `presentation → domain` を禁止している仕様判断の再評価（L1-003 残 8 件 + phasegate 導入先への影響）。ISSUE-014 と合流候補 |
| ISSUE-020 | **新規起票 → CLOSED (v0.82.0)**: `PhaseDependenciesPresetId` を VO 側へ移動し循環依存を解消。L1-003: 9 → 8 |
| ISSUE-021 | **新規起票 → CLOSED (v0.81.0)**: Full mode bypass を設計文書存在チェックで実装。PhaseGateQueryPort 拡張 + HandlePreToolUseUseCase 修正。ISSUE-018 の前提条件を解消 |
| ISSUE-022 | **新規起票 → CLOSED (v0.85.0)**: `no-layer-violation.ignorePatterns` に `**/index.ts` を追加し Unit barrel 誤検知を解消。L1-003: 15 → 8（barrel 7 件解消） |
| ISSUE-019 | **CLOSED (v0.86.0)**: 選択肢 A 採用。`ALLOWED_DEPENDENCIES.presentation` に `'domain'` 追加で Robert C. Martin 版 CA 準拠に変更。ADR-014 起票。L1-003: 8 → 0（presentation→domain 8件解消） |
| 現在の lint 状態 | **0 件** 🎉。全 L1-001〜L1-007 violations 無し。ISSUE-003 (159件スタート) 完全解消 |
| 次の最優先 | ISSUE-010 (103件 @story-id) / ISSUE-014 (preset `strict-ddd` で厳格派 opt-in 提供) / ISSUE-001 (Medium, inception 設計順序強制) |

---

## 背景

各 `ISSUE-XXX/issue_description.md` の「状態」欄が実装の現状と乖離している疑いが生じたため、
コード / CLI 実行 / テスト出力で実態を裏取りした結果を記録する。
ISSUE-007 完了 (v0.74.0) 直後の時点。

## 監査方法

- `npx phasegate lint` / `validate-metadata` の実機実行
- `scripts/harness/` 配下の Unit / adapter 存在確認
- CHANGELOG.md / 最新 git log の突き合わせ

## 監査結果

| Issue | 記載ステータス | 実態 | Priority | 所感 |
|---|---|---|---|---|
| **ISSUE-001** | 未記載 | 🔴 **真に未解決** | Medium | inception 内の設計順序強制ロジック無し（`check-story-reflection-usecase.ts` は product 反映のみチェック） |
| **ISSUE-003** | 低 | 🟢 **完全解消 (159 → 0 件、v0.75.0〜v0.86.0)** | — | v0.86.0 / ADR-014 で最終 8 件も CLOSED。lint violations 0 件達成 |
| **ISSUE-006** | IN PROGRESS | 🟢 **ほぼ完了** | P1 | `quick-mode` Unit / `fullModeRequiredWhen` 配線済み。**他PJ 再レビューのみ残** |
| **ISSUE-007** | CLOSED（2026-04-23） | 🟢 **真に完了** | — | Wave 9 (v0.74.0) で acceptance 全 8 条件成立。2026-04-23 に CLOSE 宣言 |
| **ISSUE-009** | 未着手 | 🟡 **DEFERRED**（2026-04-23） | ~~P1~~ → P2 | Orchestration Engine との責務境界見直しで保留。単一 agent 前提の現状は既存 hook で機能 |
| **ISSUE-010** | 未着手 | 🔴 **真に未解決（103 件実測）** | P2 | `validate-metadata` を 112 `.md` に個別実行 → **103 件** `@story-id は必須です` エラー |
| **ISSUE-012** | P3 未着手 | 🔴 **真に未解決** | P3 | `scripts/harness/integrations/pre-commit.ts:120` で `TS_EXTENSION` ハードコード、config 化なし |
| **ISSUE-013** | CLOSED | 🟢 **真に完了** | — | `bash-write-target-extractor.ts` に `apply_patch` heredoc 対応済み（以前セッションで渡された ARGUMENTS は stale） |

## 推奨対応順序

### 1. ISSUE-010（P2 / 103 件実測） — 最短で効果が出る

**根拠**:
- scope が明確（103 件 + 新規文書への対応ルール整備）
- 段階的 PR で潰せる（Unit ごとに処理する粒度）
- `@story-id` が埋まると ISSUE-008 Phase B-3 の pre-commit 接続と相まって、document-to-code のトレーサビリティが初めて実運用に乗る

**最小アプローチ**:
1. `docs/product/construction/{unit}/*.md` 103 件について、traceability frontmatter (`initial_creation: true`) を一括付与 or 代表 story ID を人手で付番
2. validate-metadata を pre-commit に接続（ISSUE-008 Phase B-3 の延長で既に接続されている可能性あり — 要確認）
3. 以降、新規作成文書は skill 側で自動付与（ISSUE-008 で配線済み）

### 2. ISSUE-009（保留 / 2026-04-23 DEFERRED 決定）

**保留理由**:
- Orchestration Engine（`docs/product/orchestration_product_overview.md`）の session-manager / `.session.lock` / worktree 契約と責務境界が重複
- 20 並列 agent の堅牢性要件は orchestration 側が担うべきで、guard-system に持ち込むのは責務越境
- Orchestration Engine が未実装（"Inception — 設計確定待ち"）のため、契約確定待ち
- 単一 agent（Claude Code）前提の現状は既存 hook で機能しており緊急性は低い

**再開条件**: [ISSUE-009 issue_description.md の「再開条件」セクション](ISSUE-009/issue_description.md#再開条件) 参照

### 3. ISSUE-006 仕上げ（ほぼ完了 → CLOSE 作業のみ）

**根拠**:
- Story A (v0.63.0) / Story B (v0.64.0) で実装は着地
- 他PJ 再レビューが形式的に残っているだけ
- 手元の別 PJ があれば 30 分で検証 → issue_description に記録 → CLOSE 可能

### 4. ISSUE-001（Medium）

**根拠**:
- inception 内の設計プロセス順序 (logical → test → tdd) が強制されないギャップ
- ISSUE-010 と独立に着手可能だが、優先度は下
- ISSUE-010 / ISSUE-009 が済んでから戻るのが妥当

### 5. ISSUE-003（低） / ISSUE-012（P3）

**根拠**:
- ISSUE-003 は残 159 件だが、L1-003/L1-004/L1-006/L1-007 は既存コードのリファクタに帰着する作業で、優先度低
- ISSUE-012 は他言語プロジェクト導入要望が顕在化してから着手で十分

## 補足：ステータス欄の信頼性について

今回のように issue_description の「状態」欄は history/wave が増えるにつれ更新が追いつかず、
実態とズレる。対応案:

1. CI で `issue_description.md` の状態欄と CHANGELOG.md の整合を機械チェック
2. または issue_description から「状態」欄を削除し、CHANGELOG と `_status_audit.md`（本文書）を single source にする

これは ISSUE レベルのメタ改善課題であり、本監査の範囲外。

---

**監査者**: Claude Code (Opus 4.7 / 1M context) + general-purpose agent による裏取り
**参照 CLI 実行時点**: phasegate v0.81.0 (local source, commit 0027365)
