# WI-183 Logical Design

@work-item-id WI-183

## Scope

The generated AIDLC GitHub Actions workflow must work in downstream projects immediately after install. It must not assume pnpm-only setup or call nonexistent `harness` npm scripts.

## Design

- Render and install the same `docs/templates/ci/aidlc-gate.yml` file.
- Enable Corepack, then choose install command by lockfile:
  - `pnpm-lock.yaml` -> `pnpm install --frozen-lockfile`
  - `yarn.lock` -> `yarn install --immutable` with frozen-lockfile fallback
  - npm lockfiles -> `npm ci`
  - no lockfile -> `npm install`
- Run checks through the package bin: `npx phasegate lint --json` and `npx phasegate phasegate:ci-check --json`.

## Verification

- `ci:generate-template --type aidlc-gate --render` contains lockfile-based install branches and no `pnpm run harness`.
- `install --apply` deploys a workflow with the same contract.
