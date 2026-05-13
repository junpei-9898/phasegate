# Getting Started

<!-- @work-item-id WI-171, WI-175 -->

Use this page when you want the shortest path from "PhaseGate is installed" to "the next command is obvious".

## First Run

Start with one question: what kind of repository are you setting up?

| Answer | Command | Success state |
|---|---|---|
| New project with agent hooks | `npx phasegate init --name <project> --agent both --with-husky --with-ci` | `phasegate.config.json`, skills, hooks, agent context files, Husky, and CI targets exist |
| Existing repository | `npx phasegate install --dry-run` then `npx phasegate install --apply` | Existing hooks/scripts are preserved and `.phasegate/manifest.json` records managed targets |
| CI-only rollout | `npx phasegate setup:agent --intent ci-only --with-ci --dry-run --json` | The plan explains CI changes without requiring local hooks |
| Codex-only project | `npx phasegate init --agent codex --with-husky` | `.codex/hooks.json`, `AGENTS.md`, `.codex/skills`, and pre-commit backstop are present |
| Strict validation rollout | `npx phasegate setup:agent --intent strict --dry-run --json` | The plan lists strict checks, L4 risk, rollback, and validation commands |

After any setup path:

```bash
npx phasegate doctor
npx phasegate phasegate:check-ready
npx phasegate validate --layer L2 --format human
```

The first successful run is:

- `doctor` has no unexpected red finding for the targets you chose.
- `phasegate:check-ready` exits successfully.
- L2 validators pass or report only issues you intentionally left for a later rollout.
- The active agent can read `AGENTS.md` or `CLAUDE.md` and see the PhaseGate managed instructions.

`setup:agent --json` also returns `plan.completeness`. Treat `configured` and `planned` as local repository evidence, and treat `manual` entries as work PhaseGate cannot prove from local files, such as Codex user-level feature enablement or the first hosted CI run.

## Daily Use

```bash
npx phasegate work-items:status --dry-run
npx phasegate validate --layer L2 --format human
npx phasegate phasegate:status --json
```

Use `work-items:status` before commit when a WI is close to completion. Use `phasegate:status --json` when an agent needs machine-readable hook, baseline, and validator health.

## Agent Use

```bash
npx phasegate setup:agent --dry-run --json
npx phasegate config:plan --intent codex-hooks --dry-run --json
```

`setup:agent` reads repository setup state and returns missing targets, completeness, questions, risk, rollback, and validation steps. `config:plan` maps natural-language change intents such as "enable Codex hooks" or "make L4 stricter" to concrete files, commands, checks, and a read-only `phasegate.config.json` patch preview when the intent changes local config.

## CI Use

```bash
npx phasegate ci:generate-template --type aidlc-gate --render
npx phasegate validate --layer all --format ci
```

For warning-as-failure rollout, preview the change first:

```bash
npx phasegate config:plan --intent ci-fail-on-warning --dry-run --json
```
