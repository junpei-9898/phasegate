# 論理設計: documentation

@story-id HF2-01
@story-id HF2-02
@work-item-id WI-116
## README Roadmap Reconciliation

README.md and README.ja.md describe L4-004/L4-005 as implemented registrations. Remaining roadmap items are limited to rollout polish such as scheduling, defaults, and operational docs.

## WI-127 / WI-128 README inventory and L4 rollout

README / README.ja are the public feature inventory and must match the shipped `skills/*/SKILL.md` count. The current shipped surface is 30 skills, including the operations skills `/phasegate-config-doctor` and `/phasegate-toolkit-guide`. @work-item-id WI-127

L4 documentation treats L4-004 `doc-freshness` and L4-005 `pointer-validation` as registered validators. `p2:check-freshness` and `p2:validate-pointers` are compatibility commands; canonical L4 execution is `validate --layer L4`. Scheduling, default-off rollout, and strict fail-on-warning policy are tracked under WI-128. @work-item-id WI-128

## G2 Test Quality Documentation Surface

<!-- @work-item-id WI-129, WI-130, WI-131 -->

README / guide documentation describes L2 test-quality as semantic AAA plus assertion strength, not a runner-specific string check. Quick Mode documentation keeps L2 test-quality non-negotiable. CLI reference documents `phasegate:generate-matrix` as the entry point that feeds Nyquist validation and reports intent coverage warnings.
<!-- @work-item-id WI-139 -->
## WI-139 Semantic Drift Documentation

Documentation explains semantic drift as design intent / implementation behavior / test observation comparison. It is an upper-level L4 signal and does not replace structural L4-001 drift reports.
# Public Contract Drift Remediation

@work-item-id WI-149
@work-item-id WI-150
@work-item-id WI-151
@work-item-id WI-158

Documentation owns the public wording contract across README and `docs/guide/*`. README stays an entry point, while `docs/guide/cli-reference.md` owns the complete command catalog. Layer/status semantics and report output path semantics must be documented in guides before release.

## WI-167 Product Documentation Unit Catalog

<!-- @work-item-id WI-167 -->

`documentation` is the active Unit for public guides, README feature inventory, and user-visible contract wording. Historical `docs` construction files remain legacy alias material only. Product reflection for WI-127..139 and later documentation-facing work belongs here unless a WI explicitly affects another runtime Unit. Hyphenated Unit IDs are the canonical names used by source metadata; underscore-named unit files under `docs/product/units/` are compatibility aliases and must not define different ownership.

<!-- @work-item-id WI-176 -->
## WI-176 Claude Code Readiness Documentation

README and `docs/guide/*` document `plan.agentReadiness` as the agent-specific view of setup state. Public wording must make the row meanings explicit:

- `claude`: `.claude/settings.json`, `CLAUDE.md`, and shared skills.
- `codex`: `.codex/hooks.json`, `AGENTS.md`, shared skills, and manual user-level hook caveats.
- `shared`: package/config/skills plus selected Husky and CI managed targets.

Documentation must also state that manual external actions remain outside local proof even when local readiness is configured.

<!-- @work-item-id WI-177 -->
## WI-177 Claude Code Post-Readiness and Recovery Docs

Public troubleshooting documentation explains the difference between readiness completion and work-start actions. When Claude and shared readiness are configured, docs route the user to WI confirmation or creation, inception planning/design, product reflection with `@work-item-id`, and validation.

Troubleshooting documentation also maps structured apply errors to likely environmental causes: permission denial, incompatible existing paths, and managed target hash/refusal. It points agents to `phasegate-config-doctor` for ai-assisted merge/recovery and `phasegate-toolkit-guide` for read-only setup guidance.

Troubleshooting documentation explains that `phasegate doctor` defaults to full/both-agent diagnostics, while `phasegate doctor --agent claude` and `--agent codex` evaluate the selected agent plus shared targets. Scoped-out findings are informational and should not be repaired unless the user intends to enable that agent. @work-item-id WI-178

<!-- @work-item-id WI-179 -->
## WI-179 Scoped-Out Repair Guidance Documentation

Public CLI and troubleshooting docs explain that `scopedOutFindings[]` are explanatory records for unselected agents. Their `repairHint` and `suggestedSkill` fields are intentionally `null` in scoped reports, and `repairHintApplicability: "only-if-agent-selected"` means the repair guidance becomes relevant only if the user switches to or installs that agent.

<!-- @work-item-id WI-180 -->
## WI-180 Scoped-Out Effective Repair Documentation

Public CLI and troubleshooting docs explain `currentScopeRepairTarget` and `repairModeApplicability` so agents do not treat scoped-out `repairMode: "mechanical"` as current repair work. The human doctor summary also exposes scoped-out check IDs for quick terminal inspection.

<!-- @work-item-id WI-156 -->
## WI-156 Documentation Drift Guardrail

Public/operator docs document `L4-006 skill-catalog-drift` as the first automated documentation drift guardrail from the P4 backlog. Documentation must state that skill count drift is automated, while command/script drift and install target drift remain manual release checklist items until separate validators exist.

<!-- @work-item-id WI-207 -->
## WI-207 Personal Install Documentation

README and installation/setup artifact guides document `phasegate install --personal` for developers evaluating PhaseGate inside team-owned repositories. Public wording must state that `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, and team `.gitignore` are not planned or written in personal mode.

Documentation also lists the local-only artifacts: `.phasegate-local/config.json`, `.phasegate/manifest.json`, and the managed block in `.git/info/exclude`. Codex user-level hooks are documented as manual guidance rather than a project-local `.codex/hooks.json` write.

@work-item-id WI-208
Public docs and setup skills must describe personal install as an automatic local-only agent bootstrap. GitHub CLI auth, repo secrets, and CI setup remain excluded from personal apply.

@work-item-id WI-209
Public docs and setup skills must describe personal install agent runtime paths as real files/directories instead of symlink shims. The documented Claude Code artifacts are `.claude/settings.json` and `.claude/skills/`; the documented Codex artifacts are `.codex/hooks.json` and `.codex/skills/`. `.phasegate-local/phasegate.config.json` remains the local config fallback, and `.git/info/exclude` keeps these runtime artifacts local-only.

@work-item-id WI-210
Public docs must distinguish project install and personal install skill topology. Project install deploys selected bundled skill bodies to root `skills/` and exposes them through `.claude/skills` / `.codex/skills` symlinks. Personal install keeps local-only real per-agent skill directories. Reconcile/update-skills are documented as the repair path for older project installs whose skill links exist but whose shared `skills/` target is empty.

@work-item-id WI-216
Public install and setup artifact docs must state the existing-skills merge contract: PhaseGate refreshes only bundled skill directories selected by `--skills core|all`, preserves user-owned skills, can adopt legacy `.harness-version` personal catalogs, and uninstalls only manifest-managed bundled skills plus metadata.
## WI-213 Personal Install Documentation

<!-- @work-item-id WI-213 -->

README and installation guide content describe personal install as a local-only setup that still deploys functional local alternatives for agent context, commit-time hooks, and reference docs. The docs continue to state that team-owned files are not mutated.

Personal install documentation must name only runtime-visible context paths. Claude personal context is `.claude/CLAUDE.md`. Codex personal context is root `AGENTS.md` when PhaseGate can create or manage that file locally; if a team `AGENTS.md` already exists, documentation must explain that PhaseGate will not overwrite or mask it and that `doctor --personal --agent codex` reports the remaining context step. @work-item-id WI-215
## Configurable Documentation Path Guidance

<!-- @work-item-id WI-214 -->
Public README and guide content list the `paths` keys for design docs, inception docs, principles docs, and folder rules. Guidance states that repositories with non-`docs/` documentation layouts can map PhaseGate documentation requirements through config, while product-wide Level 1 artifacts remain governed by phase dependency gate configuration.

<!-- @work-item-id WI-132, WI-133, WI-136, WI-137, WI-138 -->
## G4 Contract Traceability Documentation Surface

Public documentation participates in `L2-015 contract-traceability-coverage` through opt-in `@phasegate-contract` / `@phasegate-observation` annotations rather than treating every Markdown heading as a contract; `docs/guide/contract-traceability.md` owns the public annotation wording. Documented finding vocabulary follows the shipped service: public-contract required behaviors and Port adapter-contract coverage (WI-132), contract-derived boundary-case coverage via `missing-boundary-test` (WI-133), docs/code state-set mismatch and invalid terminal-transition findings (WI-136), error-contract shape / exit-code / error-path findings (WI-137), and traceability-graph completeness including the public-docs-versus-contract synchronization smell (WI-138).

<!-- @work-item-id WI-134, WI-135 -->
## G5 Architecture Semantic Documentation Policy

Public guidance presents `L4-002` architecture semantic findings as advisory/warning signals unless a project explicitly opts into warning failure. This covers preset-driven side-effect capability boundaries (WI-134) and decision-placement advisories reported with confidence and evidence (WI-135); both are documented as preset-driven architecture policy, not hard failures.

<!-- @work-item-id WI-170 -->
## WI-170 Phase2 Config Compatibility Contract

`docs/guide/configuration.md` documents `phase2Extensions.initialCreationExpirationRules` as a schema-validated public compatibility config section, and `docs/guide/cli-reference.md` keeps `p2:check-initial-creation` in the Phase 2 Extensions table as a compatibility command. Documentation must not promote the `p2:*` path above `validate --layer L4` as the canonical L4 execution path.

<!-- @work-item-id WI-171, WI-172, WI-173, WI-174 -->
## P3 Onboarding And Setup Workflow Documentation

README links first-run users to `docs/guide/getting-started.md`, `docs/guide/recipes.md`, and `docs/guide/troubleshooting.md` so the first success path does not require reading the whole CLI catalog (WI-171). Guides and setup skills document `phasegate setup:agent` as a planning-first orchestrator with dry-run/apply/json modes (WI-172) and `phasegate config:plan` as a read-only intent-to-plan surface consulted before editing `phasegate.config.json` (WI-173). `docs/guide/setup-artifacts.md` documents `AGENTS.md` / `CLAUDE.md` as managed setup targets whose managed section coexists with user-owned content, with ci-governance lesson pointers kept in a dedicated marker section (WI-174).

<!-- @work-item-id WI-175 -->
## WI-175 Setup Completeness Documentation

README and setup guides explain how to read `setup:agent` `plan.completeness` entries (area / status / evidence / nextAction / risk), why external manual checks stay separate from local readiness, and how the read-only `config:plan` `configPatch` / `managedTargets` preview should be reviewed before `phasegate.config.json` edits. Structured install apply failures are documented as target-aware errors that exit non-zero.
