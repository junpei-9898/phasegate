---
traceability:
  initial_creation: true
---

# Coverage Report: documentation

@work-item-id WI-165

The documentation Unit owns public guides, README wording, and user-visible contract explanations. A dedicated coverage report is needed because WI-117..148 and WI-159..164 added public semantics that are not covered by runtime Unit reports alone.

| Area | Coverage expectation |
|---|---|
| README / guide inventory | Public feature and command lists match shipped CLI and skills. |
| Validator catalog wording | L2/L3/L4 IDs match validator-system and Quick Mode docs; old `L2-001..L4-003`-only catalog is not reintroduced. |
| Status / drift JSON semantics | `docs/guide/cli-reference.md` and `docs/guide/layer-model.md` describe the public payload keys and advisory policy. |
| Contract traceability | `docs/guide/contract-traceability.md` explains annotations and findings without exposing internal validator implementation details. |
| Setup lifecycle | `docs/guide/setup-artifacts.md` and installation guide distinguish managed targets, generated artifacts, runtime state, and legacy artifacts. |

Legacy `docs` Unit reflection is treated as alias history. New public documentation reflection should use `@work-item-id WI-XXX` in the active `documentation` Unit product docs.

<!-- @work-item-id WI-171, WI-172, WI-173, WI-174 -->
## P3 Onboarding Coverage

| Public surface | Coverage expectation |
|---|---|
| `README.md` | Links to first-run guides and mentions `setup:agent`, `config:plan`, and agent context managed sections. |
| `docs/guide/getting-started.md` | First-run / daily-use / CI-use / agent-use paths identify next command and success state. |
| `docs/guide/recipes.md` | Provides first-run, retrofit, agent hooks, CI, strict L4, and config-change recipes. |
| `docs/guide/troubleshooting.md` | Explains doctor finding fields, repair hints, suggested skills, refused managed targets, and Codex hook checks. |
| `docs/guide/setup-artifacts.md` | Lists `AGENTS.md` / `CLAUDE.md` as managed targets and separates lesson pointers from standard managed instructions. |
