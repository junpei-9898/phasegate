# Phasegate

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**Phasegate -- AI-agnostic quality defense toolkit.**

Enforces structural integrity between design intent and code, regardless of which AI agent you use.

---

## Why Phasegate?

AI coding agents are fast but unconstrained. They skip design steps, violate layer boundaries, and produce code that drifts from intent. Phasegate solves this with a portable, agent-independent defense layer that makes it **physically impossible** to implement without design, commit without validation, or merge without traceability.

Works with **Claude Code, Codex, Cursor, Copilot**, or any other AI agent.

---

## Features

| Feature | Description |
|---|---|
| **5-Layer Defense Model** | L0 through L4 validators from editor time to scheduled audits |
| **28 AIDLC Skills** | Full coverage from product architecture to story implementation |
| **Phase Dependency Model** | Blocks implementation when required design documents are missing |
| **Quick Mode** | Lightweight gate for bugfixes, docs, tests, and config changes |
| **Claude Code Hooks** | Native PreToolUse / PostToolUse / Stop hook integration |
| **Codex CLI Hooks** | `PreToolUse(Bash)` / `PostToolUse(Bash)` / `Stop` hook integration (native `apply_patch` falls back to pre-commit) |
| **HarnessError Format** | Every error includes ADR references and fix examples for AI self-correction |
| **Configurable Phase Gates** | Define custom gates with `gates[]` in config. Default uses AIDLC phase dependencies |
| **Protected File Control** | Configure which files are protected from AI writes via `protectedFiles.exclude` |
| **Bash Write Detection** | Detects and blocks shell-based file writes (`sed -i`, `tee`, `cp`, `mv`, redirects) |
| **Presets** | minimal, standard, and strict -- choose your quality level |

---

## Quick Start

### 1. Install

```bash
npm install --save-dev phasegate
```

### 2. Initialize

```bash
npx phasegate init --name my-project
```

This deploys 28 skills to `skills/`, creates agent-specific links such as `.claude/skills` or `.codex/skills`, installs design principles docs (`docs/principles/*.md`, `docs/folder_management_rules.md`), and generates `phasegate.config.json`.

Optional: add `--with-husky` to also install a `.husky/pre-commit` hook that runs L2 validators.

### 3. Start the AIDLC

Launch your AI agent and run the `/product-architect` skill to begin.

---

## 5-Layer Defense Model

```
+------------------------------------------------------------------+
|  L0  HOOKS ENGINE          Agent hook configuration              |
+------------------------------------------------------------------+
|  L1  EDITOR TIME           Biome AST rules                       |
|  require-unit-comment, no-layer-violation, no-any-abuse,         |
|  enforce-folder-structure, no-ghost-file, no-code-duplication    |
+------------------------------------------------------------------+
|  L2  PRE-COMMIT            Validators                            |
|  phase-gate, metadata completeness, test-quality (AAA pattern)   |
+------------------------------------------------------------------+
|  L3  CI/CD                 Validators                            |
|  security, performance, coverage threshold, nyquist traceability |
+------------------------------------------------------------------+
|  L4  SCHEDULED             Validators                            |
|  drift-detection, consistency-check, dead-code analysis          |
+------------------------------------------------------------------+
```

| Layer | Trigger | Key Checks |
|---|---|---|
| L0 | Agent hooks | Hook config validation, gate checks |
| L1 | Editor save / lint | Import graph, layer violations, AI anti-patterns |
| L2 | Pre-commit | Phase gate, `@unit`/`@layer` metadata, test quality |
| L3 | CI/CD pipeline | Security, performance, coverage (90%/95%), requirements traceability |
| L4 | Scheduled (weekly) | Design-code drift, cross-document consistency, dead code |

---

## 28 Skills

Skills cover the full **AIDLC (AI-Driven Development Life Cycle)**, enforcing phase dependencies so that implementation cannot begin without design.

### Foundation (4)

| Skill | Purpose |
|---|---|
| `/product-architect` | Define product vision, domains, architecture, and constraints |
| `/story-writer` | Create Who/What/Why user stories with acceptance criteria |
| `/story-mapper` | Prioritize stories and define MVP scope |
| `/unit-designer` | Group stories into independently buildable Units |

### Design (5)

| Skill | Purpose |
|---|---|
| `/domain-designer` | DDD tactical design -- aggregates, entities, value objects, events |
| `/logical-designer` | Hexagonal architecture design (ports and adapters) |
| `/mock-designer` | UI mockup design for early validation |
| `/uiux-designer` | Final UI/UX definition from test cases and logical design |
| `/environment-designer` | Local dev environment and infrastructure design |

### Test Engineering (7)

| Skill | Purpose |
|---|---|
| `/unit-test-designer` | Unit test case design from domain models |
| `/it-test-designer` | Integration test case design from logical design |
| `/scenario-test-designer` | E2E scenario test case design |
| `/unit-test-logic-designer` | Vitest implementation logic with pseudocode |
| `/it-test-logic-designer` | Integration test Vitest implementation logic |
| `/scenario-test-logic-designer` | Playwright E2E implementation logic |
| `/test-coverage-checker` | Coverage verification and Nyquist validation |

### Implementation (4)

| Skill | Purpose |
|---|---|
| `/story-implementor` | TDD implementation (Red-Green-Refactor) with atomic commits |
| `/quick-implementor` | Lightweight implementation for bugfixes, docs, tests, config |
| `/implementation-planner` | Implementation plan from Unit specs and domain models |
| `/implementation-readiness-checker` | Pre-implementation readiness verification |

### Verification (8)

| Skill | Purpose |
|---|---|
| `/consistency-checker` | Cross-layer consistency check across design documents |
| `/cascade-updater` | Propagate lower-phase discoveries to upstream design docs |
| `/codex-delegator` | Delegate tasks to Codex CLI with quality oversight |
| `/codebase-mapper` | Generate structure map from `@unit`/`@layer` annotations |
| `/doc-freshness-checker` | Design document staleness detection (L4 extension) |
| `/pointer-validator` | Validate file path references in design documents |
| `/engineering-perspective` | Multi-perspective design review (Beck, Fowler, Martin, Evans) |
| `/skill-creator` | Create or update agent skills |

---

## Configuration

`phasegate.config.json` is the **Single Source of Truth** for quality settings.

### Presets

Phasegate has two orthogonal preset families — defense and architecture. See the note at the end of this section for naming conventions.

**Defense preset** (`project.preset`) -- overall layer strictness:

| Preset | Layers | Coverage | Use Case |
|---|---|---|---|
| `minimal` | L1 + L2 | -- | Prototyping, early exploration |
| `standard` | L1 - L3 | 90% | Production development (default) |
| `strict` | L1 - L4 | 95% | Mission-critical systems |

**Architecture preset** (`architecture.preset`) -- layer names and dependency directions used by L1-003 / L1-004:

| Preset | Layers | Use Case |
|---|---|---|
| `clean` (default) | `domain / application / infrastructure / presentation` | Clean Architecture / AIDLC full harness |
| `strict-ddd` | `clean` layers + stricter cycle detection | DDD-focused new projects |
| `onion` | `domain / application / interface` | Onion Architecture |
| `hexagonal` | `core / ports / adapters` | Hexagonal / Ports-and-Adapters |
| `layered` | `presentation / business / data` | Classic 3-tier layered |
| `flat` | No layers | Small scripts / CLI tools / retrofit start |
| `custom` | User-defined `layers` + `allowedDependencies` | Any other shape |

For selection guidance and config examples see [Preset Selection Guide](docs/guide/preset-selection.md).

> **Naming convention**: "defense preset" refers to CI strictness (`strict` / `standard` / `minimal`). "architecture preset" refers to layer topology (`clean` / `onion` / `hexagonal` / `layered` / `flat` / `strict-ddd` / `custom`). They are set independently.

`phaseDependencies.preset` -- phase-gate shape and storyReflection defaults (independent of `project.preset`):

| Preset | Phase 3 gates | storyReflection default | Use Case |
|---|---|---|---|
| `full` | All AIDLC gates | Enabled -- `logical_design` + `domain_model` required, `uiux` optional | AIDLC full ceremony (alias for legacy `default`) |
| `standard` | Core gates | Enabled -- `logical_design` required, `domain_model` optional | Production development with moderate rigor |
| `minimal` | None | Disabled -- no inception -> product enforcement | Prototyping / exploration |
| `custom` | User-defined via `gates[]` array | User-defined via `storyReflection.mappings` | Full control (requires `override: true`) |

`storyReflection` blocks writes to `src/{unit}/*` when an inception US/issue design exists but has not been cascaded into `docs/product/construction/{unit}/`. See [ADR-013](docs/ADR/ADR-013-story-reflection-gate.md) and the [Configuration guide](docs/guide/configuration.md#storyreflection-inception--product-gate).

### Key Configuration Sections

```jsonc
{
  "project": { "name": "my-project", "preset": "standard" },
  "layers": {
    "L0": { "enabled": false },
    "L1": { "enabled": true },
    "L2": { "enabled": true },
    "L3": { "enabled": true },
    "L4": { "enabled": false }
  },
  "quickMode": {
    "allowedCategories": ["bugfix", "docs", "test", "config"],
    "maintainedLayers": ["L1", "L2"],
    "relaxedGates": ["phase-gate", "2-phase-execution"],
    "fullModeRequiredWhen": {
      "mixedCategories": true,
      "newDomainFile": true,
      "apiContractChange": true
    }
  },
  "phaseDependencies": {
    "preset": "standard",
    "storyReflection": { "enabled": true }
  },
  "protectedFiles": {
    "exclude": ["tsconfig.json", "package.json"]
  },
  "baseline": {
    "enabled": true,
    "path": ".phasegate/baseline.json"
  }
}
```

`quickMode.fullModeRequiredWhen` declares which conditions force a Quick Mode change to escalate to the full `/story-implementor` flow. All three triggers default to `true` so retrofits stay safe; flip individual flags to `false` only when a project intentionally accepts the risk.

`baseline` opts in to the **Phase A-2 retrofit grandfather**: pre-existing files captured in `.phasegate/baseline.json` are exempted from `phase-gate` until they are structurally modified. Generate the snapshot with `npx phasegate baseline` before introducing the harness to an existing repository. Since v0.71.0 the `baseline.enabled` flag defaults to `true`, so simply running `npx phasegate baseline` after `init` is enough — no manual config edit needed. For a step-by-step retrofit walkthrough see [Retrofit Adoption Guide](docs/guide/retrofit-adoption.md).

---

## Configurable Phase Gates

By default, Phasegate enforces the **AIDLC phase dependency model** -- implementation files cannot be written without prerequisite design documents. This works out of the box with the `standard` or `full` preset.

For projects that don't follow AIDLC, you can define **custom gates** using the `gates[]` array in `phasegate.config.json`:

```jsonc
{
  "phaseDependencies": {
    "preset": "custom",
    "override": true,
    "gates": [
      {
        "name": "schema-first",
        "level": 3,
        "blocks": ["src/api/**/*.ts"],
        "requires": ["docs/api/openapi.yaml"],
        "description": "API implementation requires OpenAPI schema"
      }
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Unique gate identifier |
| `level` | 1 \| 2 \| 3 | Phase level (higher levels require lower-level gates to pass first) |
| `blocks` | string[] | Glob patterns for files this gate protects |
| `requires` | string[] | Files that must exist before writing to blocked paths |
| `dependsOn` | string[] | Other gate names that must pass first |
| `description` | string | Human-readable gate description |

Gates form a **DAG** (Directed Acyclic Graph). Circular dependencies are rejected at config load time.

---

## Claude Code Hooks Integration

Phasegate integrates natively with Claude Code via hooks in `.claude/settings.json`:

| Hook | Trigger | Behavior |
|---|---|---|
| `PreToolUse` | `Write`, `Edit`, or `Bash` (write operations detected) | Blocks writes to source files without design docs; enforces `quickMode.fullModeRequiredWhen` (escalates Quick Mode → Full when triggered); skips files captured in the `.phasegate/baseline.json` snapshot until they are modified; protects configured files; detects Bash write operations (`sed -i`, `tee`, `cp`, etc.) |
| `PostToolUse` | `Write` or `Edit` | Auto-formats and validates metadata |
| `Stop` | Session end | Runs full test suite to ensure all tests pass |

All hook errors use the `HarnessError` format with ADR references and fix examples, enabling AI agents to self-correct without human intervention.

---

## Codex CLI Integration

Phasegate also integrates with [OpenAI Codex CLI](https://developers.openai.com/codex/cli) via hooks in `.codex/hooks.json`. The CLI itself is agent-agnostic, so the same `npx phasegate hook <event>` commands power both Claude Code and Codex.

### Quick setup

```bash
# 1. Initialize the project for Codex (creates project-local files such as .codex/hooks.json and .codex/skills)
npx phasegate init --name my-project --agent codex --with-husky

# 2. Enable the Codex CLI feature flag manually on your machine
codex features enable codex_hooks
```

For dual-agent projects (Claude + Codex), use `--agent both`.

`init` sets up files inside the project. The Codex CLI user-level setting (`codex_hooks`) remains an explicit manual step.

### Coverage and known limitation

Because Codex's native `apply_patch` tool is routed through an internal `ApplyPatchHandler` and does not emit hook events ([openai/codex#16732](https://github.com/openai/codex/issues/16732)), pre-edit hard-block coverage is limited to Bash-based writes. Native `apply_patch` violations are caught at commit time by the pre-commit layer.

| Path | Pre-edit hard block | Commit-time block |
|---|---|---|
| Shell writes (`sed -i`, `tee`, heredoc, `cat >`) | ✅ `PreToolUse(Bash)` | ✅ pre-commit |
| Bash-invoked `apply_patch <<'PATCH'` | ✅ `PreToolUse(Bash)` (via `BashWriteTargetExtractor`) | ✅ pre-commit |
| Native `apply_patch` tool call | ❌ not intercepted by Codex today | ✅ pre-commit |

**Recommended mitigation**: commit frequently (e.g., after each logical change) so native `apply_patch` violations surface quickly. See the full guide for details.

---

## CLI Reference

```bash
npx phasegate <command> [options]
```

| Command | Description |
|---|---|
| `init --name <name>` | Initialize project, deploy skills, generate config |
| `lint` | Run L1 Biome AST checks |
| `validate --layer <L1-L4\|all>` | Run validators for specified layer |
| `ci-check` | Full CI check (L2-L4) |
| `update-skills` | Update skills to latest version |
| `phasegate:status` | Display overall harness health summary |
| `phasegate:check-phase --unit <id>` | Check current phase for a Unit |
| `check-change-category --paths <csv>` | Classify changed files into Quick Mode categories and report whether Full Mode is required (`--format json`, `--fail-on-full-required`) |
| `baseline` | Create `.phasegate/baseline.json` snapshot for Phase A-2 retrofit grandfather (`--dry-run`, `--force`, `--paths <glob,glob,...>`, `--json`). `baseline.enabled` defaults to `true` since v0.71.0. |
| `scaffold-design --unit <id> --phase <logical\|domain\|uiux\|unit-test\|it-test>` | Generate minimum viable design doc from `templates/*.template.md` into `docs/product/construction/{unit}/*.md` (`--force`, `--json`). Materializes the `scaffold: ...` line emitted by phase-gate errors. |
| `list-errors --layer <L0-L4>` | List error definitions with fix examples |
| `hook <pre-tool-use\|post-tool-use\|stop>` | Run a Claude Code hook (reads JSON from stdin) |
| `pre-commit` | Run L2 pre-commit validators on staged files |
| `delegate-sonnet [...args]` | Delegate task to Sonnet 4.6 (transparent wrapper) |
| `migrate work-items --dry-run` / `--apply` | Migrate legacy `ISSUE-XXX` / `H{NN}-{NN}` directories under `docs/inception/` to the unified `WI-XXX` layout (frontmatter `type` / `legacy_id` / `affects` injected). Sequential allocator skips numbers already used by existing WIs. See [CLI Reference -- Work Item Migration](docs/guide/cli-reference.md#work-item-migration). |
| `migrate --schema v3` | Upgrade `phasegate.config.json` to v3 schema by adding the `architecture` key (idempotent). |

See the [Japanese README](README.ja.md) for the complete CLI reference.

---

## Documentation

Detailed guides are available under `docs/guide/`:

- [Installation](docs/guide/installation.md) -- Detailed install and setup instructions
- [Configuration](docs/guide/configuration.md) -- `phasegate.config.json` full reference
- [CLI Reference](docs/guide/cli-reference.md) -- All CLI commands and options
- [Skills Overview](docs/guide/skills-overview.md) -- 28 skills with AIDLC execution order
- [5-Layer Defense Model](docs/guide/layer-model.md) -- L0-L4 layer details and HarnessError format
- [Hooks Integration](docs/guide/hooks-integration.md) -- Claude Code Hooks setup and behavior
- [Codex Integration](docs/guide/codex-integration.md) -- Codex CLI setup, coverage matrix, and native `apply_patch` limitation
- [Quick Mode vs Full Mode](docs/guide/quick-vs-full-mode.md) -- When to use `/story-implementor` vs `/quick-implementor`, with decision flow and case studies
- [Retrofit Adoption Guide](docs/guide/retrofit-adoption.md) -- Onboard an existing project without getting blocked: `init` → `baseline` → `scaffold-design` in 4 steps

Additional resources:

- `docs/principles/architecture-philosophy.md` -- Architecture philosophy
- `docs/principles/testing-rules.md` -- Testing conventions
- `docs/ADR/` -- Architecture Decision Records

---

## Contributing

Contributions are welcome. See [DEVELOPMENT.md](DEVELOPMENT.md) for internal architecture, regression tests, and release procedures.

---

## License

[Apache License 2.0](LICENSE)

---

[Japanese version / 日本語版](README.ja.md) | [Developer Guide](DEVELOPMENT.md) | [開発者ガイド](DEVELOPMENT.ja.md)
