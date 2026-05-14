# WI-197 Domain Model

@story-id H08-01
## Command Alias

`CommandAlias` は public CLI command 名から canonical command 名への互換 mapping を表す。

| Alias | Canonical command | Semantics |
|---|---|---|
| `status` | `phasegate:status` | Informational health report。JSON status が fail でも command error ではない。 |
| `complete-check` | `phasegate:complete-check` | Gate command。lint と validators の結果で exit code を決める。 |

## Deprecation Notice

旧 alias は互換 entrypoint として扱う。canonical handler の実行結果は変えず、alias 経由であることだけを warning として出す。

## Invariants

- Alias dispatch は canonical command の flags (`--json` など) をそのまま渡す。
- `Unknown command` は alias table に存在しない command のみに使う。
- Canonical command の exit code を alias wrapper が上書きしない。
