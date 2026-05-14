# WI-194 Domain Model

## Concepts

- **Downstream-safe workflow template**: A bundled GitHub Actions template that works in npm, yarn, or pnpm projects without monorepo-only scripts.
- **Packaged CLI invocation**: Runtime command execution through `npx phasegate`.

## Invariants

- Scheduled templates do not install pnpm explicitly.
- Scheduled templates do not use `cache: 'pnpm'`.
- Agent context refresh workflow calls `npx phasegate ci:auto-refresh-agent-context --apply`.
