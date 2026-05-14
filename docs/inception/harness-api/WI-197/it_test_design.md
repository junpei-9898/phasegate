# WI-197 IT Test Design

@story-id H08-01
## Cases

| ID | Scenario | Command | Expected |
|---|---|---|---|
| IT-WI197-001 | `status` alias dispatch | `phasegate status --json` | `Unknown command` を出さず、`phasegate:status --json` と同じ JSON envelope を返す。 |
| IT-WI197-002 | `complete-check` alias dispatch | `phasegate complete-check --json` | `Unknown command` を出さず、canonical complete-check handler を実行する。 |
| IT-WI197-003 | alias deprecation notice | `phasegate status` | 新 command 名 `phasegate:status` を含む notice を出す。 |
| IT-WI197-004 | unknown command remains rejected | `phasegate definitely-unknown` | exit 2 と `Unknown command` を維持する。 |

## Regression Guard

既存 e2e CLI harness test に alias cases を追加し、main help の command list と runtime dispatch が乖離しないことを確認する。
