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
