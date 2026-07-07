---
id: WI-228
type: chore
severity: normal
status: tested
affects: [docs]
---

# WI-228: レガシー ADR 18 件を canonical 形式へ正規化し validate-adr ゲートを実効化する

> 起票日: 2026-07-05
> 経緯: `docs/inception/_shared/adr-gate-normalization-followup.md` §3 Remediation plan (ii) の実施。

## 背景

`docs/ADR/` のレガシー ADR 18 件（`ADR-001-*.md` 〜 `ADR-018-*.md`）は、`adr-foundation` の discovery 正規表現 `^[0-9]{3}-[a-z0-9-]+\.md$` に一致せず、`validate-adr` ゲートから不可視（phantom ADR）だった。加えて本文が旧 markdown-header 形式（`# ADR-NNN:` / `## Status`）で YAML frontmatter を持たず、`## Alternatives` も 18/18 欠落していた。

その結果「ADR ゲートが存在する」という看板に対し、実態は「レガシー 18 件は無検査」という乖離が残存していた（`adr-gate-normalization-followup.md` §1）。

## 作業内容（docs-only）

1. **リネーム（`git mv`、履歴保持）**: `ADR-NNN-slug.md` → `NNN-slug.md`。
2. **canonical YAML frontmatter 付与**: `adr_id` / `title`（旧 H1 verbatim）/ `status`（旧 `## Status` から抽出、18 件すべて Accepted）/ `date`（git first-commit 日付）。`archgate` は本文に enforcement mapping の明示がないため省略。
3. **`## Alternatives` 追加**: 本文が代替案を記録している 4 件（014/016/017/018）は再構成として再掲、残り 14 件は「当時、代替案は明示的に文書化されていない」旨の正直な注記。捏造なし。
4. **クロスリファレンス更新**: 旧 `docs/ADR/ADR-NNN-*.md` を指す hard link を全て新パスへ更新。
5. **corpus test 更新**: `real-adr-corpus.it.test.ts` を正規化後の現実（legacy 残存 0 / 001..021 discoverable）に合わせて更新。

## 受け入れ基準

- `validate-adr --all` が 21 件を発見し全件 PASS（exit 0）。
- full test suite green。
- 旧 ADR パスへの dangling markdown link が残存しない（CHANGELOG の履歴 backtick 記録を除く）。

## スコープ外（deferred）

- H05-02 AC binding（`@ac H05-02-N` タグ付与 / §12 Key Decisions 全件網羅検証）。over-claim を避けるため別タスクへ deferred。
- `validate-adr` の L2/L3 ゲート層への常時配線（`adr-gate-normalization-followup.md` §3 の残タスク）。
