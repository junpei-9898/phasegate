---
id: WI-170
type: issue
severity: normal
status: tested
affects: [documentation, config-foundation]
source: internal
---

# WI-170: Initial Creation Expiration Configuration Contract

> 起票日: 2026-05-12
> 起票経緯: `p2:check-initial-creation` と `phase2Extensions.initialCreationExpirationRules` を公開設定として扱う場合の契約を明確にするため。

## 起票条件

`p2:check-initial-creation` と `phase2Extensions.initialCreationExpirationRules` を公開設定として扱う判断をした場合に実施する。

## 判断

WI-156 の guardrail 方針後、`p2:check-initial-creation` は CLI help と `docs/guide/cli-reference.md` に公開 compatibility command として残す。`phase2Extensions.initialCreationExpirationRules` はこの command の設定入力として既に実装済みのため、schema / guide / product docs に公開互換契約として明記する。

## スコープ

- `p2:check-initial-creation`
- `phase2Extensions.initialCreationExpirationRules`
- config schema
- `docs/guide/cli-reference.md`
- `docs/guide/configuration.md`
- phase2 / documentation product docs

## 受け入れ基準

- [x] config key が schema に存在しないまま docs だけで推奨されない。
- [x] command が公開 CLI なのか internal maintenance command なのかが明確。
- [x] `initial_creation:true` を残すべき新規 docs と、expire すべき長期 docs の判断基準が説明される。

## 成果物

- `domain_model.md`
- `logical_design.md`
- `unit_test_design.md`
- `it_test_design.md`

## 依存

`WI-150`, `WI-156`。
