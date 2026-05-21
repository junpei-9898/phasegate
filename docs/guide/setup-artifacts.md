# Setup Artifacts

PhaseGate setup is more than `phasegate.config.json`. A healthy installation is the combination of project configuration, managed targets, generated state, runtime reports, and a small number of user-level settings.

<!-- @work-item-id WI-152 -->
<!-- @work-item-id WI-157 -->
<!-- @work-item-id WI-169 -->

## Artifact Classes

| Class | Examples | Owner | Lifecycle |
|---|---|---|---|
| Managed target | `.claude/settings.json`, `.codex/hooks.json`, `CLAUDE.md`, `AGENTS.md`, `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`, `.github/workflows/phasegate-aidlc-gate.yml`, `.claude/skills`, `.codex/skills`, `package.json` PhaseGate scripts/devDependency | PhaseGate managed block or symlink plus user content | Created or merged by `install`, refreshed by `reconcile`, removed or reversed by `uninstall` |
| Configuration | `phasegate.config.json`, `package.json` | User owned, PhaseGate assisted | Created by `init`; `install` may merge scripts/devDependency into `package.json` |
| Generated artifact | `.phasegate/manifest.json`, `.phasegate/backups/*`, `.phasegate/uninstalled-*.json`, `.phasegate/baseline.json` | PhaseGate | Written by lifecycle commands and validators; safe to regenerate only through the owning command |
| Runtime state/report | `.phasegate/hook-skip-events.jsonl`, explicit `doctor --report-out <path>` output, `reports/regression/*`, resolved `reporting.outputDir` reports | PhaseGate command output | Produced while hooks, doctor, and validation commands run |
| Personal install artifact | `.phasegate-local/config.json`, `.git/info/exclude` PhaseGate block | One developer on one machine | Created by `phasegate install --personal`; team `.gitignore` and team-owned files are not modified |
| Legacy artifact | `.harness-hooks.yml`, old Fuse hook files, `.harness/session-state.json`, `.harness/context-priority.json`, `.harness/reports` fallback | Compatibility only | Not required for current install lifecycle unless a project intentionally keeps an archived integration |
| User-level setting | Codex CLI `hooks` feature flag | User machine | Must be enabled manually with `codex features enable hooks`; project commands do not modify it |

## Managed Targets

`install --apply` and `reconcile --apply` manage only explicit targets. The current structured lifecycle covers:

- Agent hook JSON: `.claude/settings.json`, `.codex/hooks.json`
- Agent context files: `CLAUDE.md` and `AGENTS.md` managed sections. `AGENT.md` singular is not a PhaseGate managed target; treat it as user-owned content or migrate it manually. <!-- @work-item-id WI-174 -->
- Husky scripts when requested: `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`
- CI workflow when requested: `.github/workflows/phasegate-aidlc-gate.yml`
- Agent skill links: `.claude/skills`, `.codex/skills`
- Package metadata: PhaseGate scripts and `devDependencies.phasegate` in `package.json`
- Manifest: `.phasegate/manifest.json`

`AGENTS.md` has two PhaseGate sections with separate ownership. `<!-- phasegate:managed-section:start -->` contains standard setup/WI workflow instructions. `<!-- phasegate:lesson-pointers:start -->` is reserved for `ci:auto-refresh-agent-context` lesson pointers. Refreshing lesson pointers must not replace the standard managed section or user-owned content. <!-- @work-item-id WI-174 -->

`init --with-ci` still deploys the legacy-compatible template set, including `.github/workflows/aidlc-gate.yml`, `.github/workflows/consistency-check.yml`, and `.github/workflows/agent-context-refresh.yml`. Structured `install` uses `.github/workflows/phasegate-aidlc-gate.yml` so it can coexist with existing project CI without taking over a generic workflow filename.

## Doctor Findings

`phasegate doctor` evaluates setup health from the managed targets and related project state. Findings include `repairMode`, optional `repairHint`, and optional `suggestedSkill`.

| Field | Meaning |
|---|---|
| `repairMode: "mechanical"` | A PhaseGate command can usually fix the target, for example `npx phasegate install --apply` or `--force`. |
| `repairMode: "ai-assisted"` | Existing user content needs judgment before merging. Doctor includes `suggestedSkill`, usually `phasegate-config-doctor`. |
| `repairMode: "manual"` | Human review is required, commonly for semantic CI/workflow conflicts. |
| `repairHint` | Copyable command for mechanical cases. |
| `suggestedSkill` | Skill name, rationale, and invoke command for agent-assisted repair planning. |

`doctor --report-out <path>` writes exactly to the path you pass. `.phasegate/last-doctor-report.json` is not created automatically; it is only a conventional path you may choose.

## Reports And Runtime Files

`reporting.outputDir` is the default project-visible report directory for phase dependency and phase-gate reports. Some command families have their own contracts:

- `doctor --report-out <path>` writes to the explicit path only.
- `regression:*` commands write under `reports/regression/`.
- `.harness/reports` is a legacy fallback used only when a phase-dependency provider cannot resolve project config.
- `.phasegate/hook-skip-events.jsonl` records hook bypass/skip observations for diagnosis; it is runtime state, not a managed install target.

## Hook Skip Events

<!-- @work-item-id WI-166 -->

`.phasegate/hook-skip-events.jsonl` is a best-effort JSON Lines runtime log written by agent hooks when a hook intentionally skips or cannot complete its normal validation path. Each record is diagnostic evidence for `phasegate status --json`, not a gate result by itself.

Typical fields are:

| Field | Meaning |
|---|---|
| `hookType` | Hook family, for example `PostToolUse` or `Stop`. |
| `reason` | Stable skip reason such as disabled hook, reentry detection, timeout, or unsupported native pre-edit path. |
| `targetPaths` | Files or paths relevant to the hook event when available. |
| `timestamp` | Event time in ISO format. |

Recording is best-effort. A write failure must not change the original hook exit code. Operators should use the latest skip event and counts in `phasegate status --json` to decide whether to run `phasegate doctor`, refresh hooks with `reconcile`, enable Codex hook support, or rely on the L2 pre-commit backstop for edits that native hooks cannot observe before mutation.

## Legacy Retirement

Current setup does not require `.harness-hooks.yml`, old Fuse hook files, `.harness/session-state.json`, or `.harness/context-priority.json`. Treat them as project-local compatibility artifacts. Before deleting them, check whether an archived workflow or local script still references them; otherwise prefer documenting them as retired rather than wiring new guidance around them.

`hooks:config validate` is a compatibility command for old `.harness-hooks.yml` projects. New setup should use `install`, `doctor`, `reconcile`, `lint`, and `validate`.
