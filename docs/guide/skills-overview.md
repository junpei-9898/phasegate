# Skills Overview

Phasegate provides 29 skills covering the full AIDLC (AI-Driven Development Life Cycle). `npx phasegate init` and project `npx phasegate install` deploy skill bodies to root `skills/` and expose them to enabled agents through `.claude/skills/`, `.codex/skills/`, or `.agents/skills/` links. Personal install instead writes real local-only per-agent skill directories. <!-- @work-item-id WI-210 --> <!-- @work-item-id WI-385 -->

Bundled `SKILL.md` files include `languages: [typescript]` frontmatter so PhaseGate can distinguish current TypeScript-oriented guidance from future language-specific skill variants. The metadata is advisory for applicability and does not prevent non-TypeScript projects from installing the catalog. <!-- @work-item-id WI-212 -->

## AIDLC Process — Skill Execution Order

The AIDLC follows a 3-level execution flow, each level producing design artifacts that gate the next.

### Level 1: Requirements Definition

Artifacts are placed in `inception/_shared/`.

Skills run in sequence:

1. `/product-architect` — Define the product vision, domain boundaries, tech stack, and constraints.
2. `/story-writer` — Create user stories in Who/What/Why format with acceptance criteria.
3. `/story-mapper` — Organize MVP scope and prioritize stories.
4. `/unit-designer` — Group stories into independently buildable Units and define integration contracts.

### Level 2: Cross-Unit Design

Artifacts are placed in `inception/{unit}/`.

Skills run per Unit:

1. `/domain-designer` — DDD domain model (Aggregates, Entities, Value Objects, Domain Events).
2. `/logical-designer` (cross-unit mode) — Hexagonal Architecture design with Ports and Adapters.
3. `/environment-designer` — Local development environment and infrastructure design.
4. `/mock-designer` — UI mockup design for validation and feedback.

### Level 3: Story Implementation

Artifacts are placed in `inception/{unit}/{US-XXX}/`.

Skills run per User Story:

1. `/logical-designer` (US-specific mode) — Story-scoped logical design refinement.
2. `/scenario-test-designer` — E2E scenario test case design. Its `scenario_test_design.md` output is a required input of `/uiux-designer`.
3. `/uiux-designer` — Final UI/UX definition incorporating test cases, logical design, and existing UI.
4. `/unit-test-designer` — Unit test case design from domain model.
5. `/it-test-designer` — Integration test case design from logical design.
6. `/test-coverage-checker` — Coverage verification of all three test case designs before test logic design.
7. `/unit-test-logic-designer` — Vitest implementation logic with pseudocode.
8. `/it-test-logic-designer` — IT Vitest implementation logic with pseudocode.
9. `/scenario-test-logic-designer` — Playwright E2E test implementation logic.
10. `/implementation-readiness-checker` — Automated pre-implementation readiness verification.
11. `/story-implementor` — TDD implementation with atomic commits.

### Phase Dependency Rules

- **Level 2 requires Level 1**: The `/unit-designer` output (Unit definitions and contracts) must exist before any Level 2 skill can run.
- **Level 3 requires Level 2**: `domain_model.md` and `logical_design.md` must exist in `docs/product/construction/{unit}/` before Level 3 skills can write to that Unit. This is enforced by the pre-tool-use hook and cannot be bypassed.
- **story-implementor requires test design**: At least one test design phase (unit-test-designer, it-test-designer, or scenario-test-designer) must be completed before `/story-implementor` can execute. This requirement is non-relaxable.

## Skill Categories

### Foundation (4 skills)

| Skill | Description |
|---|---|
| `/product-architect` | Define product vision from business requirements. Covers domain boundaries, architecture decisions, tech stack, and constraints. |
| `/story-writer` | Create user stories in Who/What/Why format with acceptance criteria. |
| `/story-mapper` | Organize MVP scope and prioritize stories. Convergence phase after story divergence. |
| `/unit-designer` | Group stories into independently buildable Units and define integration contracts. |

### Design (5 skills)

| Skill | Description |
|---|---|
| `/domain-designer` | DDD domain model design — Aggregates, Entities, Value Objects, and Domain Events. |
| `/logical-designer` | Hexagonal Architecture design (Ports and Adapters). Two modes: cross-unit and US-specific. |
| `/mock-designer` | UI mockup design for validation and feedback. |
| `/uiux-designer` | Final UI/UX definition incorporating test cases, logical design, and existing UI. |
| `/environment-designer` | Local development environment and infrastructure design. Bridges code and platform. |

### Test Engineering (7 skills)

| Skill | Description |
|---|---|
| `/unit-test-designer` | Design unit test cases from domain model. |
| `/it-test-designer` | Design integration test cases from logical design. |
| `/scenario-test-designer` | Design E2E scenario test cases from user stories, logical design, and mockups. |
| `/unit-test-logic-designer` | Design Vitest implementation logic with pseudocode for unit tests. |
| `/it-test-logic-designer` | Design Vitest implementation logic for DB, Repository, UseCase, and Controller integration tests. |
| `/scenario-test-logic-designer` | Design Playwright E2E test implementation logic with selector strategies and seed data. |
| `/test-coverage-checker` | Test coverage verification — checks acceptance criteria, domain logic, and UseCase coverage. Includes Nyquist Validation. |

### Implementation (3 skills)

| Skill | Description |
|---|---|
| `/story-implementor` | TDD implementation based on logical and environment design. Produces atomic commits with environment verification and lessons-learned feedback. Phase 1 planning covers Unit identification, domain-model review, API design, and layer-by-layer strategy. |
| `/quick-implementor` | Quick Mode ad-hoc implementation for bugfixes, docs, tests, and config changes. Phase Gate relaxed; L1/L2 maintained. |
| `/implementation-readiness-checker` | Automated pre-implementation readiness verification — checks test design, coverage, and logic design existence. |

### Verification (7 skills)

| Skill | Description |
|---|---|
| `/consistency-checker` | Cross-layer consistency check across AIDLC design documents. Detects contradictions and gaps. |
| `/cascade-updater` | Feedback lower-phase discoveries to upstream design documents and reconcile impact. |
| `/codex-delegator` | Delegate tasks to Codex CLI with Claude Code as quality manager. Supports parallel execution of design, test, and implementation tasks. |
| `/codebase-mapper` | Analyze `@unit`/`@layer` annotations across all source files to generate a structure map. Visualizes Unit distribution, inter-Unit dependencies, and circular dependencies. |
| `/doc-health-checker` | Design document health check (L4 validator extension). Wraps `p2:check-freshness` (stale documents / code-design drift) and `p2:validate-pointers` (broken file-path pointers). |
| `/engineering-perspective` | Design review from Kent Beck, Martin Fowler, Uncle Bob, and Eric Evans perspectives. Multi-angle quality evaluation. |
| `/skill-creator` | Create and update Agent Skills. Packaging, scripting, references, and asset management. |

### Operations (3 skills)

| Skill | Description |
|---|---|
| `/phasegate-config-doctor` | Diagnose and explain PhaseGate configuration, installation, and hook setup issues. |
| `/phasegate-toolkit-guide` | Operator guide for PhaseGate toolkit usage, rollout choices, and command selection. |
| `/release-publisher` | Guide the release flow: minor version bump, `vX.Y.Z` tag, and `npm publish --auth-type=web` (security key / FIDO WebAuthn). |
