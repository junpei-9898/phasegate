# 論理設計: setup

## WI-086 / WI-087 / WI-090 Initialization and Deployment Feedback

<!-- @work-item-id WI-086, WI-087, WI-090 -->
@story-id H09-01
Setup commands generate hook assets and guidance from explicit CLI options. Workspace-aware defaults, supported skill set flags, and post-init next steps are surfaced through deterministic output so initialization failures or typoed flags do not silently fall back to unintended behavior.
# Public Setup CLI Reflection

@work-item-id WI-150

Setup lifecycle documentation must match public help: `init`, `install`, `doctor`, `uninstall`, `reconcile`, `update-skills`, `scaffold-wi`, and `emit-agent-rules` are binary subcommands. JSON variants for `install`, `doctor`, `uninstall`, and `reconcile` are automation contracts.

## Agent Setup Completeness Summary

<!-- @work-item-id WI-175 -->

`setup:agent` must expose a completeness summary in both dry-run and apply JSON output. The summary is an ordered list of setup areas with `area`, `status`, `evidence`, `nextAction`, and `risk`.

Local config, agent hooks, agent context, skills, git hooks, CI, and validation are local readiness areas. Codex feature enablement, CI execution, and registry or hosted-service state are external manual checks. Green local readiness must not imply external manual checks are complete.

Setup artifacts are classified as managed targets, generated artifacts, runtime state/reports, legacy artifacts, and user-level settings. Product docs and public guides use the same vocabulary so `phasegate.config.json`, hook JSON, manifest, reports, and Codex user feature flags are not conflated. `docs/guide/setup-artifacts.md` is the public inventory. @work-item-id WI-152 @work-item-id WI-169

Legacy `.harness-hooks.yml`, old Fuse hook files, `.harness/session-state.json`, and `.harness/context-priority.json` are compatibility artifacts, not current install targets. `hooks:config validate` remains compatibility-only. @work-item-id WI-157

<!-- @work-item-id WI-163 -->
## WI-163 Generated CI Wiring

Setup owns placement of generated CI workflow targets as managed setup artifacts. The current install lifecycle manages `.github/workflows/phasegate-aidlc-gate.yml` as the default project gate target; scheduled L4 audit templates remain generated CI artifacts rather than hidden install state unless a user explicitly installs/renders them.

`install`, `doctor`, and `reconcile` should report CI workflow drift as setup target drift, while validator ID selection inside a workflow remains ci-governance / validator-system responsibility.

<!-- @work-item-id WI-171, WI-172, WI-173, WI-174 -->
## P3 User Onboarding And Agent Setup

Setup exposes first-run decisions as user-answerable paths rather than a raw command catalog:

- `getting-started` documents first-run / daily-use / CI-use / agent-use success states.
- `setup:agent` reads repository state and emits an agent-readable plan before writing setup files.
- `config:plan` maps later setup/configuration change intent to targets, commands, risk, rollback, and validation.
- `AGENTS.md` and `CLAUDE.md` are managed setup targets for selected agents; `AGENT.md` singular remains user-owned/unsupported.

Setup lifecycle commands must preserve user content outside managed markers and route ambiguous merge choices through ai-assisted review instead of silent overwrite.
