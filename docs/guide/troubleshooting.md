# Troubleshooting

<!-- @work-item-id WI-171, WI-172, WI-173, WI-175, WI-176 -->

Start with:

```bash
npx phasegate doctor --json
```

Each finding has a severity, a repair mode, and optional next-step fields.

| Field | Meaning |
|---|---|
| `severity` | `red` blocks the expected setup state; `warn` needs review but may be acceptable for partial rollout |
| `repairMode` | `mechanical` can be handled by PhaseGate commands; `ai-assisted` needs an agent to preserve user intent; `manual` needs human review |
| `repairHint` | Copyable command for mechanical repair |
| `suggestedSkill` | Agent skill to invoke when a merge or setup choice needs reasoning |

## Common Findings

| Finding | First action |
|---|---|
| `claude-hook-missing` | `npx phasegate install --agent claude --dry-run` |
| `codex-hook-missing` | `npx phasegate install --agent codex --dry-run` |
| `husky-pre-commit-missing` | `npx phasegate setup:agent --intent agent-hooks --with-husky --dry-run --json` |
| `ci-workflow-missing` | `npx phasegate setup:agent --intent ci-only --with-ci --dry-run --json` |
| agent context drift | `npx phasegate reconcile --dry-run` |

## Refused Managed Target

If `install`, `reconcile`, or `uninstall` refuses a target, do not immediately force it. Inspect the diff and ask the agent to explain:

- which file is repo-managed and which part is user-owned;
- why the target cannot be merged mechanically;
- what backup and rollback path will exist if `--force` is used;
- which validation commands will be run afterward.

## Codex Hooks Do Not Fire

Check both project and user-level state:

```bash
npx phasegate doctor --json
codex features enable codex_hooks
npx phasegate phasegate:status --json
```

Native Codex `apply_patch` writes are validated by the pre-commit backstop. Bash-based writes can be blocked before execution when hooks are enabled.

## Agent Setup Is Ambiguous

Use the planner instead of guessing:

```bash
npx phasegate setup:agent --intent retrofit --dry-run --json
npx phasegate config:plan --intent codex-hooks --dry-run --json
```

The planner output is intentionally agent-readable: detected state, questions, planned targets, risks, rollback, and validation commands are all explicit.

## Setup Completeness Still Has Manual Checks

`doctor` green means the local managed setup is consistent for the inspected targets. It does not prove user-level Codex feature flags, hosted GitHub Actions execution, npm registry state, or team policy acceptance.

Check `plan.completeness` in `setup:agent --json`:

- `configured`: PhaseGate found local evidence.
- `planned`: `--apply` will create or refresh the local target.
- `manual`: complete the listed external action yourself.
- `not-applicable`: the current intent/options did not select that area.

When `install` or `setup:agent --apply` returns a structured `error`, use its `target`, `operation`, `code`, `recovery`, and `partialChanges` fields before rerunning.

## Claude Code Setup Still Feels Unclear

Run the Claude-specific planner path:

```bash
npx phasegate setup:agent --agent claude --intent strict --with-husky --dry-run --json
```

Check `plan.agentReadiness`:

- `agent=claude`: local Claude Code targets (`.claude/settings.json`, `CLAUDE.md`, skills).
- `agent=shared`: package/config/skills plus selected Husky and CI targets.
- `agent=codex`: should be `not-applicable` unless you selected `--agent both` or `--agent codex`.
