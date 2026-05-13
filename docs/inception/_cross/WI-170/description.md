---
id: WI-170
type: issue
severity: normal
status: drafted
affects: [phase2-extensions, documentation, config-foundation]
source: internal
---

# WI-170: Initial Creation Expiration Configuration Contract

> 起票日: 2026-05-12
> 起票経緯: `p2:check-initial-creation` と `phase2Extensions.initialCreationExpirationRules` を公開設定として扱う場合の契約を明確にするため。

## 起票条件

`p2:check-initial-creation` と `phase2Extensions.initialCreationExpirationRules` を公開設定として扱う判断をした場合に実施する。

## スコープ

- `p2:check-initial-creation`
- `phase2Extensions.initialCreationExpirationRules`
- config schema
- `docs/guide/cli-reference.md`
- `docs/guide/configuration.md`
- phase2 / documentation product docs

## 受け入れ基準

- [ ] config key が schema に存在しないまま docs だけで推奨されない。
- [ ] command が公開 CLI なのか internal maintenance command なのかが明確。
- [ ] `initial_creation:true` を残すべき新規 docs と、expire すべき長期 docs の判断基準が説明される。

## 依存

`WI-150`, `WI-156`。
