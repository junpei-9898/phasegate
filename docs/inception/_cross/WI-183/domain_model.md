# WI-183 Domain Model

@work-item-id WI-183

## Contract

| Concept | Responsibility |
|---|---|
| AIDLC gate workflow | GitHub Actions workflow distributed to `.github/workflows/phasegate-aidlc-gate.yml`. |
| Package manager detector | Shell lockfile branches that select pnpm, yarn, npm ci, or npm install. |
| PhaseGate workflow command | `npx phasegate ...` invocation resolved from installed package dependency. |

## Invariants

- Workflow content must not call `pnpm run harness ...`.
- Workflow content must not configure `actions/setup-node` with pnpm cache before pnpm setup.
- The rendered workflow and installed workflow must share the same downstream package contract.
