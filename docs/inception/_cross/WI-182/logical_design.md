# WI-182 Logical Design

@work-item-id WI-182

## Scope

The downstream pre-commit template installed by PhaseGate must execute through the published package entrypoint. It must not call monorepo-only files such as `scripts/harness/main.ts`.

## Design

- Render and install the same `docs/templates/hooks/pre-commit` file.
- Define `PHASEGATE_CMD="${PHASEGATE_CMD:-npx phasegate}"` so downstream users can override the command while the default uses the package bin.
- Run `lint` and `validate --layer L2 --format human` through `PHASEGATE_CMD`.
- Keep monorepo dogfood commands in repository scripts; do not embed them in downstream templates.

## Verification

- `ci:generate-template --type pre-commit --render` contains `npx phasegate` and does not contain `scripts/harness/main.ts`.
- `install --apply` deploys the same downstream-safe hook content.
