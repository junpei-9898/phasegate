# WI-142 IT Test Design

<!-- @work-item-id WI-142 -->

| Case ID | Scenario | Input | Expected |
|---|---|---|---|
| IT-WI142-001 | render agent-context-refresh without `--preset` | `ci:generate-template --type agent-context-refresh --render` | exit code 0 and workflow YAML is printed |
| IT-WI142-002 | help explains default preset | `ci:generate-template --help` | `--preset` description says default is `standard` |

