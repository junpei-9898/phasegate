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
## WI-213 Personal Install Documentation

<!-- @work-item-id WI-213 -->

README and installation guide content describe personal install as a local-only setup that still deploys functional local alternatives for agent context, commit-time hooks, and reference docs. The docs continue to state that team-owned files are not mutated.
## Configurable Documentation Path Guidance

<!-- @work-item-id WI-214 -->
Public README and guide content list the `paths` keys for design docs, inception docs, principles docs, and folder rules. Guidance states that repositories with non-`docs/` documentation layouts can map PhaseGate documentation requirements through config, while product-wide Level 1 artifacts remain governed by phase dependency gate configuration.
