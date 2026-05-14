# WI-194 Logical Design

## Scope

The remaining scheduled CI templates must be downstream-package safe and avoid pnpm-only or monorepo-only assumptions.

## Design

- Update `consistency-check.yml` and `agent-context-refresh.yml` to use the same lockfile-based install branch as `aidlc-gate.yml`.
- Remove `cache: 'pnpm'` and `pnpm/action-setup`.
- Replace `pnpm run harness ci:auto-refresh-agent-context --apply` with `npx phasegate ci:auto-refresh-agent-context --apply`.

## Verification

- Render tests assert bundled template parity and absence of pnpm-only setup for both scheduled templates.
