# WI-177 Integration Test Design

<!-- @work-item-id WI-177 -->

## Cases

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI177-001 | `setup:agent --agent both --intent strict --with-ci --with-husky --apply --json`, then read generated `CLAUDE.md` | Managed Claude context includes the post-readiness workflow from configured rows to WI planning, product reflection, and validation. |
| IT-WI177-002 | `ci:auto-refresh-agent-context --apply` with an existing user section | The managed workflow is refreshed while user-owned content is preserved. |
| IT-WI177-003 | `setup:agent --apply --json` with `.codex` as a file | Structured error includes target, operation, code, likely cause, recovery, and partial changes; recovery tells the agent to inspect and resolve the incompatible path. |
