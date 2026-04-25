---
id: WI-030
type: refactor
severity: normal
status: drafted
affects: [docs]
---

# WI-030: README / layer-model 主張と実装の乖離訂正

> 起票日: 2026-04-25
> 経緯: WI-029 完了後の docs audit で、README / layer-model.md / CLAUDE.md に複数の不正確記述を検出

## 背景

WI-028 / WI-029 で `migrate work-items` および 5-Layer Defense Model のドキュメントを整備したが、その流れで README.ja.md 全体を audit したところ、**実装が伴わない / 別系統で実装されている / 古い disclaimer が残っている**主張が複数発見された。WI-029 自身の編集にも 1 件誤記が含まれていた。

## 検出された乖離

### A. cron 時刻 / GitHub Issue 自動作成

| ファイル | 主張 | 実態 |
|---|---|---|
| README.ja.md L180 | 「デフォルトは毎週月曜 09:00 UTC に実行」 | bundled template = 月曜 04:00 UTC、CLI generator = 毎日 02:00 UTC（**両方とも 09:00 ではない**）|
| README.ja.md L180 | 「乖離やデッドコードが検出されると GitHub Issue が自動作成」 | bundled template (`templates/.github/workflows/consistency-check.yml`) には `github.rest.issues.create` 実装あり。一方、CLI 生成 template (`ci:generate-template --type consistency-check`) には issue 化 logic 無し |

### B. Feature flag disclaimer の陳腐化

| ファイル | 主張 | 実態 |
|---|---|---|
| README.ja.md L408 | Feature flags は「config への保存・読み出しは動作するが、フラグに応じたランタイム動作は未実装」 | `agentLessonCollection` は agent-integration hook で参照。`cascadeUpdate` は `CascadeUpdateService` 経由で機能。`bundleSizeLimit` は L3-002 の実 threshold。`deadCodeGC` は L4 で threshold 経路で参照。**少なくとも 4 機能で runtime 動作している** |

### C. WI-029 で私が追加した誤記

| ファイル | 主張 | 実態 |
|---|---|---|
| docs/guide/layer-model.md L4 セクション | L4 validators 一覧に `doc-freshness` / `pointer-validation` を含めた | 実装上は **`phase2-extensions` unit の `p2:check-freshness` / `p2:validate-pointers` という別 CLI コマンド**。validator-id.ts に L4-004 / L4-005 として登録されていない |

### D. その他の軽微記述

- `--preset <full|standard|minimal|custom>` は実は `default` も alias として受理する（CLI ヘルプに非掲載）
- `bundleSizeLimit` の単位が docs では「500KB」、preset JSON では `500`（数値・単位明示なし）

## 本 WI でやること

### docs only の訂正

1. **README.ja.md L180**: cron 時刻と GitHub Issue 自動化の主張を実態に揃える
   - 「bundled template (`scripts/harness/templates/.github/workflows/consistency-check.yml`) を user が `.github/workflows/` にコピーすると、月曜 04:00 UTC に走り、検出時に GitHub Issue を作成する」と訂正
   - 自動生成 CLI (`ci:generate-template`) との挙動差を明記
2. **README.ja.md L408**: feature flag の disclaimer を「**`agentLessonCollection` / `cascadeUpdate` / `bundleSizeLimit` / `deadCodeGC` はランタイム動作実装済み**」に書き換え
3. **docs/guide/layer-model.md**: L4 validators 一覧から `doc-freshness` / `pointer-validation` を削除し、「これらは `p2:check-freshness` / `p2:validate-pointers` CLI として `phase2-extensions` unit に実装、L4 validator としては未登録」と注記
4. **README.md / README.ja.md**: 「**Roadmap / 今後の実装予定**」節を新設し、本 audit で発見した実装ギャップを追加 WI として参照（WI-031〜WI-034）

### スコープ外

- code 改修（CLI generator と bundled template の統一は WI-031 で対応）
- AGENTS.md / CLAUDE.md auto-refresh 実装（WI-032）
- doc-freshness / pointer の L4 昇格（WI-033）
- L0 legacy validator 撤去（WI-034）

## 受け入れ基準

- [ ] README.ja.md L180 の cron 時刻と issue 自動化の主張が実態と一致
- [ ] README.ja.md L408 の feature flag disclaimer が実装状況と一致
- [ ] docs/guide/layer-model.md L4 セクションから誤った validator 列挙が削除される
- [ ] README.md / README.ja.md に **Roadmap** 節が追加され、WI-031〜WI-034 が今後の実装予定として参照される
- [ ] 既存テスト全 PASS、L1 lint violations 0
