---
id: WI-122
type: issue
severity: normal
status: drafted
affects: [phase2-extensions, validator-system, ci-governance, harness-api]
source: internal
---

# WI-122: doc freshness and pointer validation must gain operational semantics

> 起票日: 2026-05-09
> 起票経緯: L4-004 / L4-005 review で、doc-freshness は mtime threshold、pointer-validation は resolvability check として機能しているが、実務運用では pointer type / ownership / design-source freshness の意味論が不足していることを確認した。

## 背景

L4-004 doc-freshness と L4-005 pointer-validation は登録済みで、Phase2 compatibility command からも実行できる。一方、古いが安定した docs と stale docs の区別、参考リンクと設計正本 pointer の区別、URL pointer の扱い、broken pointer の severity などが十分に表現されていない。

これは新規 validator 追加ではなく、既存 L4-004 / L4-005 を運用判断に使える report へ引き上げる改善である。

## 本 WI でやること

1. doc-freshness を mtime だけでなく、関連 source / WI / product reflection との関係で評価できる設計にする。
2. pointer type を reference / implementation / ADR / product-doc / external-url などに分類する。
3. pointer ownership と severity を config で扱えるようにする。
4. URL pointer の skip / include / fail policy を統一する。
5. L4 report に category summary と next action を含める。

## 受け入れ基準

- [ ] 古いだけの安定 docs と、関連実装変更後に stale な docs を区別する方針が docs にある。
- [ ] pointer type ごとに fail / warn / skip を設定できる。
- [ ] external URL pointer の扱いが CLI / L4 validator で一貫する。
- [ ] broken pointer report が owner / pointer type / source document / next action を含む。
- [ ] L4-004 / L4-005 が WI-107 の advisory policy と一致する。

## 関連

- WI-107: CI/L4 execution semantics must be unified
- WI-116: README roadmap must be reconciled with implemented L4-004/L4-005 validators
- WI-118: L4 consistency-check must be connected to real product document semantics
