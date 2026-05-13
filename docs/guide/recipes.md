# Recipes

<!-- @work-item-id WI-171, WI-172, WI-173 -->

## First-Run Recipe

```bash
npm install --save-dev phasegate
npx phasegate setup:agent --intent recommended --dry-run --json
npx phasegate install --apply
npx phasegate doctor
```

Use this when you want an existing repository to keep user-owned hooks, scripts, and CI files. The dry-run explains the managed targets before any file is written.

## Retrofit Recipe

```bash
npx phasegate setup:agent --intent retrofit --dry-run --json
npx phasegate install --dry-run
npx phasegate install --apply
npx phasegate baseline --dry-run
```

Use this when a repository already has meaningful history or custom automation. Treat any refused target as an agent-assisted review task instead of forcing it blindly.

## Agent Hooks Recipe

```bash
npx phasegate setup:agent --intent agent-hooks --agent both --with-husky --dry-run --json
npx phasegate install --agent both --apply
codex features enable codex_hooks
npx phasegate doctor --json
```

The repository-managed portion covers `.claude/settings.json`, `.codex/hooks.json`, `CLAUDE.md`, `AGENTS.md`, skills links, and the Husky backstop. The Codex user-level feature flag remains a local manual setting.

## CI Recipe

```bash
npx phasegate setup:agent --intent ci-only --with-ci --dry-run --json
npx phasegate install --apply
npx phasegate ci:generate-template --type aidlc-gate --render
```

Use this when local hooks are not part of the rollout. The plan still includes validation and rollback steps so the agent can explain what changed.

## Strict L4 Recipe

```bash
npx phasegate config:plan --intent l4-strict --dry-run --json
npx phasegate validate --layer L4 --fail-on-warning --format human
```

Only enable fail-on-warning after reviewing the drift, consistency, dead-code, pointer, and freshness findings. The plan output identifies the config fields and validations the agent should cite in its change summary.

## Configuration Change Recipe

```bash
npx phasegate config:plan --intent quick-mode-strict --dry-run --json
npx phasegate check-change-category --paths <changed-files> --format json
npx phasegate ci-check --quick --dry-run
```

Use `config:plan` before changing `phasegate.config.json`. It separates repo-managed artifacts from user-level settings and lists the checks needed after the change.
