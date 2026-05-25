# Logical Design

## Problem Boundary

`RunInstallUseCase.createPersonalTargets()` currently treats local-only placement as sufficient. WI-215 changes the requirement: personal targets must also be runtime-visible according to each agent's discovery rules.

## Claude Target Strategy

Preferred target candidates:

| Candidate | Pros | Risks |
|---|---|---|
| `.claude/CLAUDE.md` | Documented project instruction path; already under ignored `.claude/`; does not touch root `CLAUDE.md`. | Need to confirm Claude Code loads `.claude/CLAUDE.md` in the same precedence expected by personal install. |
| `CLAUDE.local.md` | Documented local instruction path. | Root file must be added to `.git/info/exclude`; docs note imports are now preferred over local files. |

Implementation should pick one explicit canonical target and update install, uninstall, reconcile, doctor, docs, and tests together.

## Codex Target Strategy

Codex has no default `AGENTS.local.md` path. Viable strategies need explicit tradeoff handling:

| Candidate | Pros | Risks |
|---|---|---|
| root `AGENTS.md` only when absent | Codex loads it by default. | Cannot help repositories that already have team `AGENTS.md`; creating root file still needs `.git/info/exclude`. |
| root `AGENTS.override.md` | Codex loads it by default and it can be local-only. | It overrides team `AGENTS.md` in the same directory, so generated content must avoid hiding team instructions or this strategy should be rejected. |
| `.codex/AGENTS.md` with `CODEX_HOME=$(pwd)/.codex` guidance | Uses documented global-scope `CODEX_HOME`. | Requires users to launch Codex with an environment variable; not automatic from install alone. |
| configured fallback filename | Can support a custom local filename. | Fallback files are ignored when `AGENTS.md` or `AGENTS.override.md` exists in the same directory. |

The design must select the smallest strategy that is both automatic and non-destructive for team context. If no automatic strategy satisfies both, install output and doctor must report a manual Codex context step instead of green readiness.

## Readiness Checks

Doctor should distinguish:

- `configured`: selected agent has a runtime-visible context target.
- `manual`: selected agent requires a launch/config step such as `CODEX_HOME`.
- `blocked`: an existing unmanaged path prevents safe local context creation.

For Codex, an integration test should run `codex debug prompt-input` in a fixture repo and assert that a PhaseGate sentinel appears in the rendered prompt input.

## Migration

Re-running `install --personal --apply` should add the new target while preserving old managed targets until uninstall/reconcile cleanup semantics are defined. `uninstall --apply` must remove old and new managed personal context entries if they are present in the manifest.
