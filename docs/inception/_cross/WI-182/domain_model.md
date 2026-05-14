# WI-182 Domain Model

@work-item-id WI-182

## Contract

| Concept | Responsibility |
|---|---|
| Downstream hook template | Shell script distributed to `.husky/pre-commit` by install/render flows. |
| PhaseGate command variable | `PHASEGATE_CMD` defaults to `npx phasegate` and allows project-local override. |
| Monorepo dogfood command | Repository-local `npx tsx scripts/harness/main.ts` command, excluded from downstream templates. |

## Invariants

- Downstream hook content must not reference `scripts/harness/main.ts`.
- The rendered template and installed hook must share the same package-bin entrypoint contract.
