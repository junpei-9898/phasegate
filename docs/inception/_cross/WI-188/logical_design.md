# WI-188 Logical Design

## Scope

`skill:check-coverage --story` must validate the story and local test/coverage prerequisites before invoking any runner that could trigger `npx` auto-install or network access.

## Design

- Matrix lookup is strict for story-specific matrix files. A missing `storyId` throws `STORY_NOT_FOUND` before coverage execution.
- A matrix entry with `total=0` is treated as `NO_TESTS_FOUND` and returns a skipped/no-tests coverage result without launching Vitest.
- `VitestCoverageRunnerAdapter` checks for existing `.harness/coverage-summary.json` first.
- If no summary exists, the adapter verifies local `node_modules/vitest` exists before spawning. Missing Vitest throws guidance instead of `npx vitest`.
- When Vitest is available, the adapter runs the local binary path, not `npx`, so no registry auto-install path is entered.

## Validation

- Use-case tests assert missing story and no-tests paths do not call the coverage runner.
- Adapter tests assert missing Vitest reports dependency guidance without spawning a network-capable command.
