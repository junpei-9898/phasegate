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

Setup target and command/script drift remain release checklist responsibilities until a dedicated automated validator owns them. L4-006 only automates shipped skill catalog count drift; setup docs and release operators must still compare public setup/install target names against the current setup lifecycle and CLI help before publishing. @work-item-id WI-156

<!-- @work-item-id WI-163 -->
## WI-163 Generated CI Wiring

Setup owns placement of generated CI workflow targets as managed setup artifacts. The current install lifecycle manages `.github/workflows/phasegate-aidlc-gate.yml` as the default project gate target; scheduled L4 audit templates remain generated CI artifacts rather than hidden install state unless a user explicitly installs/renders them.

`install`, `doctor`, and `reconcile` should report CI workflow drift as setup target drift, while validator ID selection inside a workflow remains ci-governance / validator-system responsibility.

`setup:agent` validation guidance should match the selected agent. For single-agent setup it recommends the corresponding scoped doctor command, such as `phasegate doctor --agent claude`, so unselected agent targets are not mistaken for selected-agent readiness failures. Full/both-agent setup continues to recommend the default full doctor path. @work-item-id WI-178

<!-- @work-item-id WI-171, WI-172, WI-173, WI-174 -->
## P3 User Onboarding And Agent Setup

Setup exposes first-run decisions as user-answerable paths rather than a raw command catalog:

- `getting-started` documents first-run / daily-use / CI-use / agent-use success states.
- `setup:agent` reads repository state and emits an agent-readable plan before writing setup files.
- `config:plan` maps later setup/configuration change intent to targets, commands, risk, rollback, and validation.
- `AGENTS.md` and `CLAUDE.md` are managed setup targets for selected agents; `AGENT.md` singular remains user-owned/unsupported.

Setup lifecycle commands must preserve user content outside managed markers and route ambiguous merge choices through ai-assisted review instead of silent overwrite.

@work-item-id WI-202
`phasegate init --workflow strict` must not generate a Quick Mode category set that contradicts the shipped quick-implementor skill scope. Strict workflow keeps strict gate behavior through `quickMode.relaxedGates: []`, while allowed change categories remain the supported low-risk set (`bugfix`, `docs`, `test`, `config`) so small edits do not immediately lose their official Quick Mode path.

@work-item-id WI-204
`config:plan` must include an explicit relaxation/recovery intent for Quick Mode category narrowing. `quick-mode-relax` restores the supported low-risk `quickMode.allowedCategories` set and is the managed recovery path after `quick-mode-strict` or manual over-narrowing blocks direct `phasegate.config.json` edits.

<!-- @work-item-id WI-176 -->
## WI-176 Agent-Specific Setup Readiness

`setup:agent` reports `plan.agentReadiness` in addition to area-based completeness. Setup owns the local file evidence for the `claude`, `codex`, and `shared` rows, including selected hook files, agent context files, shared skills, package/config, Husky, and CI targets.

The setup contract keeps local readiness separate from external actions. A configured Claude row means `.claude/settings.json`, `CLAUDE.md`, and shared skills are present; it does not prove that the Claude Code application has opened the repository. A configured shared row does not prove hosted CI has executed.

<!-- @work-item-id WI-177 -->
## WI-177 Claude Code Post-Readiness Workflow

Setup-managed Claude context must tell the agent what to do after local readiness is configured. The managed `CLAUDE.md` section therefore bridges setup into the work lifecycle: confirm or create a WI, prepare inception planning/design artifacts, reflect accepted design into product docs with `@work-item-id`, and run readiness or layer validation before commit.

This guidance remains inside the managed section so `install`, `reconcile`, and `ci:auto-refresh-agent-context` can update it without overwriting user-owned instructions outside PhaseGate markers.
