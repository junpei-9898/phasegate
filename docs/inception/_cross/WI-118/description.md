---
id: WI-118
type: issue
severity: normal
status: drafted
affects: [validator-system, traceability-model, harness-api]
source: internal
---

# WI-118: L4 consistency-check must be connected to real product document semantics

> 起票日: 2026-05-09
> 起票経緯: WI-117 周辺レビューで、L4-002 consistency-check は validator として登録済みだが、実入力の `getLayerAnnotations()` が空で、実務上の設計文書整合性 signal として弱いことを確認した。

## 背景

L4-002 は「文書間の整合性が崩れている」ことを検出する validator として存在する。一方、現状は product docs / ADR / layer model / Unit 定義の構造を十分に読めておらず、実質的な検出範囲が狭い。

これは新しい consistency 機能の追加ではなく、既存 L4-002 の名前に見合う品質へ引き上げるための改善である。

## 本 WI でやること

1. consistency-check が確認すべき整合性対象を product docs / ADR / layer model / Unit 定義に分けて定義する。
2. `MarkdownDesignDocumentAdapter.getLayerAnnotations()` の空実装を、実際の product docs 構造に接続する。
3. ADR 参照の実在確認と、設計文書間の layer / Unit / WI annotation の不整合を検出対象に含める。
4. false positive を避けるため、設計用見出し・例示・legacy annotation の扱いを明文化する。
5. `phasegate:detect-drift` / `validate --layer L4` の advisory policy と整合する report にする。

## 受け入れ基準

- [ ] L4-002 が空入力に依存せず、実際の product docs から checkTargets を生成する。
- [ ] ADR 参照切れ、Unit 名不一致、layer vocabulary 不一致の少なくとも 3 種類を fixture で検出できる。
- [ ] legacy `@story-id` / `@issue-id` と現行 `@work-item-id` の混在を誤検知しない。
- [ ] consistency-check の結果に location / expected / actual / next action が含まれる。
- [ ] L4 advisory / fail-on-warning の扱いが WI-107 の policy と一致する。

## 関連

- WI-107: CI/L4 execution semantics must be unified
- WI-114: L4 drift detector output must become actionable at repository scale
- WI-117: L4 drift detection precision must be improved before gating use
