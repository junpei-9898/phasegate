# Unit Test Design: Codex Hooks Feature Flag Guidance

<!-- @work-item-id WI-205 -->

## Test Cases

| ID | Target | Assertion |
|---|---|---|
| UT-WI205-001 | `init --agent codex` output | Next steps contain `codex features enable hooks`. |
| UT-WI205-002 | `config:plan --intent codex-hooks --json` | External action and command list contain `codex features enable hooks`. |

## Regression Guard

Tests should fail if setup guidance reintroduces the deprecated recommended command `codex features enable codex_hooks`.
