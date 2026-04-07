# Phasegate Developer Guide

Documentation for developing and maintaining phasegate itself. If you are **using** phasegate in your project, see [README.md](README.md).

---

## Development Setup

```bash
git clone https://github.com/junpei-9898/phasegate.git
cd phasegate
pnpm install
pnpm test
```

| Requirement | Version |
|---|---|
| Node.js | >= 18 |
| pnpm | 10.x |
| TypeScript | 5.x |

---

## Internal Architecture

Phasegate is built with Clean Architecture + DDD. Each feature is an independent **Unit** under `scripts/harness/`.

Dependency direction: `domain -> application -> infrastructure / presentation` (reverse is prohibited)

### Units

| Unit | Responsibility |
|---|---|
| `config-foundation` | phasegate.config.json parsing, schema validation, presets |
| `harness-error` | HarnessError definitions, ADR references, fix examples |
| `traceability-model` | @unit/@layer/@story metadata management |
| `phase-dependency-model` | Phase dependencies, Phase Gate, storyReflection |
| `adr-foundation` | ADR management |
| `biome-ast-engine` | Biome AST analysis engine (import graph, L1 rules) |
| `validator-system` | L0-L4 validator system |
| `nyquist-validation` | Requirements-test traceability |
| `harness-api` | phasegate:* CLI command layer |
| `quick-mode` | Quick Mode determination and relaxation |
| `agent-integration` | Claude Code Hooks adapter |
| `skill-quality` | TDD cycle, coverage, Cascade Update |
| `ci-governance` | CI/CD templates, repetition error monitoring |
| `regression-suite` | K1-K15 regression test suite |
| `fuse-hooks-engine` | Hooks Engine |
| `phase2-extensions` | freshness / pointer / e2e-template (v2) |

### HarnessError Format

All validators report errors using a unified `HarnessError` format.

```typescript
interface HarnessError {
  code: string;         // "L1-003", "L2-001", etc.
  severity: "error" | "warning";
  message: string;      // Human-readable description
  suggestion: string;   // Fix suggestion
  adr_ref?: string;     // Related ADR reference ("ADR-003", etc.)
  fix_example?: string; // Fix code example (for AI agent self-correction)
}
```

---

## Optional: Shell Script Hooks

Optional hooks can be placed under `.claude/scripts/`. These are not part of phasegate's core — they are development environment customizations.

```jsonc
// Add to .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/deny-check.sh"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/format-settings-hook.sh"
          },
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/format-typescript-hook.sh"
          },
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/analyze-errors-hook.sh"
          }
        ]
      }
    ]
  }
}
```

| Script | Behavior |
|---|---|
| `deny-check.sh` | Blocks dangerous git/bash commands (`git reset --hard`, `rm -rf`, etc.) |
| `format-settings-hook.sh` | Auto-formats JSON when `settings.json` is edited |
| `format-typescript-hook.sh` | Auto-formats TypeScript files on edit (Biome / ESLint+Prettier switchable) |
| `analyze-errors-hook.sh` | Detects tsc / lint errors on TypeScript file edit |

### hook-config.json

`format-typescript-hook.sh` and `analyze-errors-hook.sh` are configured via `.claude/scripts/hook-config.json`.

```json
{
  "targetDirs": ["scripts/harness"],
  "formatter": "biome",
  "formatterArgs": ["check", "--write"]
}
```

| Field | Description | Default |
|---|---|---|
| `targetDirs` | Directories where hooks apply (relative to project root) | `[]` (empty = skip) |
| `formatter` | `"biome"` or `"eslint-prettier"` | `"biome"` |
| `formatterArgs` | Arguments passed to the formatter | `["check", "--write"]` |

---

## Developer CLI Commands

These commands are for phasegate's own development and quality assurance. For user-facing commands, see [README.md](README.md#cli-reference).

### Regression Tests

| Command | Description |
|---|---|
| `regression:run-k-requirements` | K1-K15 non-negotiable requirements regression |
| `regression:run-gng-gate` | Go/No-Go Gate 3 conditions |
| `regression:run-agent-guard` | Agent independence guard |
| `regression:run-k14-k15` | K14/K15 (Phase Dependency / Plan docs) |
| `regression:configure-ci-gate` | Configure CI gate |
| `regression:analyze-migration` | Analyze v0 test migration |
| `regression:migrate-v0-tests` | Execute v0 test migration |

### Hooks Engine

| Command | Description |
|---|---|
| `hooks:config validate` | Validate .harness-hooks.yml |
| `hooks:gate-check --story <id>` | Completion gate check |

### Phase 2 Extensions

| Command | Description | Options |
|---|---|---|
| `p2:check-freshness` | Design doc freshness check | `--pattern <glob>` `--dry-run` `--format text\|json` |
| `p2:validate-pointers` | Document file pointer validation | `--include-urls` `--format text\|json` |
| `p2:generate-e2e-template` | E2E test template generation | `--phase <phase>` `--output <path>` |

### Skill Quality

| Command | Description | Options |
|---|---|---|
| `skill:execute-tdd-cycle` | Execute TDD cycle | `--unit` `--story` `--desc` `--phase RED\|GREEN\|REFACTOR` `--passed` |
| `skill:check-coverage` | Test coverage verification | `--story <storyId>` `--json` |
| `skill:collect-lessons` | Collect agent lessons | `--story <storyId>` `--sources <paths>` `--write-artifact` |
| `skill:apply-cascade-update` | Apply cascade update | `--story <storyId>` `--dry-run` |
| `skill:validate-structure` | Validate skill structure | `--file <path>` `--json` |

### CI/CD (Developer)

| Command | Description | Options |
|---|---|---|
| `ci:check-repetition` | Repetition error detection | `--code <errorCode>` `--reset` `--json` |

---

## Regression Tests (K1-K15)

Self-tests verifying that phasegate's non-negotiable requirements are continuously met.

```bash
npx phasegate regression:run-k-requirements    # 16 tests
npx phasegate regression:run-gng-gate           # 3 tests
npx phasegate regression:run-k14-k15            # 2 tests
npx phasegate regression:run-agent-guard        # 3 tests
```

---

## Directory Structure

```
phasegate/
├── scripts/harness/
│   ├── main.ts                      # CLI entry point
│   ├── harness-error/               # HarnessError definitions
│   ├── config-foundation/           # Config parsing and schema
│   ├── traceability-model/          # Metadata management
│   ├── phase-dependency-model/      # Phase dependencies
│   ├── adr-foundation/              # ADR management
│   ├── biome-ast-engine/            # AST analysis engine
│   ├── validator-system/            # L0-L4 validators
│   ├── harness-api/                 # CLI command layer
│   ├── quick-mode/                  # Quick Mode
│   ├── agent-integration/           # Claude Code Hooks
│   ├── ci-governance/               # CI/CD templates
│   ├── regression-suite/            # K1-K15 regression tests
│   └── phase2-extensions/           # v2 extensions
├── skills/                          # 28 skills
├── templates/                       # Config templates
└── docs/                            # Documentation
```

---

## Versioning and Release

Semantic Versioning (MAJOR.MINOR.PATCH).

```bash
# 1. Update version in package.json
# 2. Commit and tag
git add package.json
git commit -m "fix: vX.Y.Z — description"
git tag vX.Y.Z
git push origin main --tags

# 3. Publish
npm publish
```

---

## Roadmap

| Version | Content |
|---|---|
| **v1.6.0 (v1 MVH)** | L1-L4, 28 skills, Claude Code Hooks, Nyquist Validation, K1-K15 regression |
| **v2.0.0** | Hooks Engine, Phase 2 extensions (doc-freshness, pointer-validator, Playwright E2E) |

---

*See also: [README.md](README.md) (user guide) / [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) (Japanese)*
