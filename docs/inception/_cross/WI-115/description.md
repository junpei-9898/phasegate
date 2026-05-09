---
id: WI-115
type: issue
severity: normal
status: implemented
affects: [traceability-model, phase-dependency-model, validator-system]
source: internal
---

# WI-115: `legacy_id` ambiguity should be unit-scoped or validated

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、移行由来の `legacy_id` が複数 Unit で再利用されうるため、product annotations の解決が曖昧になりうることを確認した。

## 背景

`legacy_id` は旧 `ISSUE-*` / `US-*` / `H##-##` 形式から `WI-XXX` へ移行するための alias である。しかし historical ID が複数 Unit に存在する場合、global lookup では誤った WI に解決される可能性がある。

これは新しい migration feature ではなく、既存 backward compatibility の曖昧性を検出・制御する問題である。

## 本 WI でやること

1. `legacy_id` の lookup scope を global / unit-scoped のどちらにするか決める。
2. global uniqueness を要求しない場合、Unit context なしの lookup で ambiguity を error として出す。
3. product docs の legacy annotation 解決が誤った WI を指さないようにする。
4. migration reporting で ambiguous legacy ID を明示する。

## 受け入れ基準

- [x] 同一 `legacy_id` が複数 WI に存在する場合の仕様が文書化されている
- [x] Unit context がない legacy lookup で ambiguity が検出される
- [x] Unit context がある legacy lookup は対象 Unit 内で解決できる
- [x] product annotation が曖昧な legacy ID を誤解決しない regression test がある

## 実装メモ

- product reflection の legacy annotation 解決は product path から unit context を推定し、その unit の WI と cross WI の scope で行う。
- 同一 scope 内に同じ `legacy_id` が複数ある場合は ambiguity として false を返し、どちらか一方の WI に誤解決しない。
- Unit context がある場合、別 Unit の同一 `legacy_id` は対象外とする。Unit context がない場合は inception 全体を scope とし、重複を ambiguity として扱う。

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
