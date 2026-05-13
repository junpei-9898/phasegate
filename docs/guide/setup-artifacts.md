# Setup Artifacts

PhaseGate setup is more than `phasegate.config.json`. A healthy installation is the combination of project configuration, managed targets, generated state, runtime reports, and a small number of user-level settings.

<!-- @work-item-id WI-152 -->
<!-- @work-item-id WI-157 -->
<!-- @work-item-id WI-169 -->

## Artifact Classes

| Class | Examples | Owner | Lifecycle |
|---|---|---|---|
| Managed target | `.claude/settings.json`, `.codex/hooks.json`, `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`, `.github/workflows/phasegate-aidlc-gate.yml`, `.claude/skills`, `.codex/skills`, `package.json` PhaseGate scripts/devDependency | PhaseGate managed block or symlink plus user content | Created or merged by `install`, refreshed by `reconcile`, removed or reversed by `uninstall` |
| Configuration | `phasegate.config.json`, `package.json` | User owned, PhaseGate assisted | Created by `init`; `install` may merge scripts/devDependency into `package.json` |
| Generated artifact | `.phasegate/manifest.json`, `.phasegate/backups/*`, `.phasegate/uninstalled-*.json`, `.phasegate/baseline.json` | PhaseGate | Written by lifecycle commands and validators; safe to regenerate only through the owning command |
| Runtime state/report | `.phasegate/hook-skip-events.jsonl`, explicit `doctor --report-out <path>` output, `reports/regression/*`, resolved `reporting.outputDir` reports | PhaseGate command output | Produced while hooks, doctor, and validation commands run |
| Legacy artifact | `.harness-hooks.yml`, old Fuse hook files, `.harness/session-state.json`, `.harness/context-priority.json`, `.harness/reports` fallback | Compatibility only | Not required for current install lifecycle unless a project intentionally keeps an archived integration |
| User-level setting | Codex CLI `codex_hooks` feature flag | User machine | Must be enabled manually with `codex features enable codex_hooks`; project commands do not modify it |

## Managed Targets

`install --apply` and `reconcile --apply` manage only explicit targets. The current structured lifecycle covers:

- Agent hook JSON: `.claude/settings.json`, `.codex/hooks.json`
- Husky scripts when requested: `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`
- CI workflow when requested: `.github/workflows/phasegate-aidlc-gate.yml`
- Agent skill links: `.claude/skills`, `.codex/skills`
- Package metadata: PhaseGate scripts and `devDependencies.phasegate` in `package.json`
- Manifest: `.phasegate/manifest.json`

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

## Legacy Retirement

Current setup does not require `.harness-hooks.yml`, old Fuse hook files, `.harness/session-state.json`, or `.harness/context-priority.json`. Treat them as project-local compatibility artifacts. Before deleting them, check whether an archived workflow or local script still references them; otherwise prefer documenting them as retired rather than wiring new guidance around them.

`hooks:config validate` is a compatibility command for old `.harness-hooks.yml` projects. New setup should use `install`, `doctor`, `reconcile`, `lint`, and `validate`.
