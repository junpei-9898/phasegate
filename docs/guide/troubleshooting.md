# Troubleshooting

<!-- @work-item-id WI-171, WI-172, WI-173, WI-175, WI-176, WI-177 -->

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

## Phase Gate Blocked a Write and I Do Not Know What the Document Should Contain

<!-- @work-item-id WI-356 -->

Phase Gate blocks (`L2-001`, `FULL_MODE_REQUIRED`) mean a required inception or product design document is missing. Two things are needed: the file skeleton, and the section structure to fill in.

**1. Generate the skeleton.** `scaffold-design` writes a placeholder document for the missing phase:

```bash
npx phasegate scaffold-design --unit <unit-id> --phase logical --dry-run
npx phasegate scaffold-design --unit <unit-id> --phase logical --apply
```

Accepted `--phase` values: `logical`, `domain`, `uiux`, `unit-test`, `it-test`.

**2. Read the section structure from the skill definition.** PhaseGate does not ship fill-in templates into your repo; the authoritative structure of every plan and inception artifact lives in the skill markdown that produces it. `install` / `init` copy these into `skills/` in your repository:

| Document | Skill definition |
|---|---|
| product architecture / unit decomposition | `skills/product-architect/SKILL.md` |
| story map | `skills/story-mapper/SKILL.md` |
| story descriptions / acceptance criteria | `skills/story-writer/SKILL.md` |
| unit plan | `skills/unit-designer/SKILL.md` |
| `logical_design.md` | `skills/logical-designer/SKILL.md` |
| `domain_model.md` | `skills/domain-designer/SKILL.md` |
| UI/UX design | `skills/uiux-designer/SKILL.md` |
| unit / IT / scenario test plans | `skills/unit-test-designer/SKILL.md`, `skills/it-test-designer/SKILL.md`, `skills/scenario-test-designer/SKILL.md` |

If `skills/` is not present in your repository — the personal install path does not copy it — read the same content from PhaseGate's own package instead:

```bash
npx phasegate skills list
npx phasegate skills info logical-designer
```

`skills info` prints the full SKILL.md to stdout, so it works from a sandboxed agent that cannot read `node_modules/`.

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
codex features enable hooks
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

By default, `phasegate doctor` inspects the full Claude + Codex + shared setup. For a deliberate single-agent setup, use `phasegate doctor --agent claude --json` or `phasegate doctor --agent codex --json`. Single-agent reports keep shared targets applicable and place the unselected agent's findings under `scopedOutFindings` with `applicability: "not-applicable"`; those findings are explanatory, not repair targets for the selected agent. Their `repairHint` and `suggestedSkill` fields are intentionally `null`; `currentScopeRepairTarget: false`, `repairHintApplicability: "only-if-agent-selected"`, and `repairModeApplicability: "only-if-agent-selected"` mean the original repair fields only become actionable if the user chooses that agent. Applicable `findings[]` use `currentScopeRepairTarget: true` and applicable repair fields. <!-- @work-item-id WI-178, WI-179, WI-180 -->

Check `plan.completeness` in `setup:agent --json`:

- `configured`: PhaseGate found local evidence.
- `planned`: `--apply` will create or refresh the local target.
- `manual`: complete the listed external action yourself.
- `not-applicable`: the current intent/options did not select that area.

When `install` or `setup:agent --apply` returns a structured `error`, use its `target`, `operation`, `code`, `recovery`, and `partialChanges` fields before rerunning.

Common structured setup errors:

| Code | Usually means | First recovery step |
|---|---|---|
| `EPERM` / `EACCES` | The current sandbox, user, or filesystem denied the write. | Ask the user to rerun in a writable workspace or approve the write, then retry the same `--apply` command. |
| `EEXIST` / `ENOTDIR` | A parent path such as `.claude` or `.codex` exists as a file or incompatible path. | Inspect the path, decide whether it is user-owned, then move or rename it before rerunning. |
| hash mismatch / refused target | A PhaseGate managed target contains user edits outside the expected hash. | Use `invoke /phasegate-config-doctor` and explain backup, merge, and `--force` tradeoffs before applying. |

## Claude Code Setup Still Feels Unclear

Run the Claude-specific planner path:

```bash
npx phasegate setup:agent --agent claude --intent strict --with-husky --dry-run --json
```

Check `plan.agentReadiness`:

- `agent=claude`: local Claude Code targets (`.claude/settings.json`, `CLAUDE.md`, skills).
- `agent=shared`: package/config/skills plus selected Husky and CI targets.
- `agent=codex`: should be `not-applicable` unless you selected `--agent both` or `--agent codex`.

When `claude` and `shared` are `configured`, the next step is work planning, not more setup. Confirm or create the WI under `docs/inception/**/{WI-XXX}/description.md`, write the needed inception plan/design files, reflect accepted design into `docs/product/...` with `@work-item-id WI-XXX`, then run `npx phasegate phasegate:check-ready` or the relevant `validate --layer ...` command.
