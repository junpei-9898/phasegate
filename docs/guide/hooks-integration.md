# Claude Code Hooks Integration

Phasegate integrates natively with Claude Code through its hooks system. This enables real-time quality enforcement during AI-assisted development.

## Setup

For new or existing projects, prefer `npx phasegate install --dry-run` followed by `npx phasegate install --apply` so existing hook JSON is merged instead of replaced. Manual editing is still possible, but then `phasegate doctor` may report missing managed targets until the expected PhaseGate entries, skill links, Husky scripts, CI workflow, and manifest are present. See [Setup Artifacts](setup-artifacts.md). <!-- @work-item-id WI-152 --> <!-- @work-item-id WI-169 -->

Add the following to `.claude/settings.json`:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/post-tool-use-hook.ts"
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/stop-hook.ts"
        }]
      }
    ]
  }
}
```

## Hook Behaviors

### Responsibility Separation (important)

Phasegate's hooks are **strictly partitioned by phase**:

| Hook | What it checks | What it does NOT check |
|------|----------------|------------------------|
| **PreToolUse** | Phase Gate, protected files, Quick Mode category gating, story-reflection | L1 lint (`@unit` / `@layer` / `any` abuse) — these are post-write concerns |
| **PostToolUse** | L1 Biome AST rules, formatter, type-check (via `analyze-errors-hook.sh`) | Phase Gate (already checked before write) |
| **Stop** | Complete-check (L2-L4 full validation suite) | Per-edit lint (already done by PostToolUse) |

This separation is intentional:
- **Pre = "should this write happen at all?"** — concerns the caller's intent and design state.
- **Post = "is what was written valid?"** — concerns the resulting code's quality.
- **Stop = "is the session ready to end?"** — concerns the cumulative state across the session.

If you expect L1 lint (e.g., missing `@unit` annotation) to **block** a Write before it happens, that is by design **not** the case. The PreToolUse hook intentionally does not run lint, because lint requires the resulting file content (which only exists after the write). Lint violations surface as **PostToolUse** decision JSON (`decision: "block"`) and trigger Claude Code to retry.

### PreToolUse (before file write)
- Enforces Phase Gate: blocks writing to source files if required design documents don't exist
- Blocks writes to protected files (package.json, biome.json, tsconfig.json)
- Quick Mode: when a write is allowed because the change is classified within `quickMode.allowedCategories`, an informational notice is emitted to stderr (`phasegate: write allowed (Quick Mode, category=<...>)`) — exit code remains 0
- Returns actionable error messages with:
  - Violation reason
  - Missing artifacts
  - Recommended skill to use next

Example error (Phase Gate violation):
```
Phase Gate Violation: scripts/harness/config-foundation/domain/test.ts
Scope: Level 3 (Implementation), Unit: config-foundation
Blocked because:
  - Missing artifact: docs/product/construction/config-foundation/domain_model.md
  - Missing plan: 2:logical-designer
Next action: Use /story-implementor skill to start from the design phase.
  Example: /story-implementor --unit config-foundation
```

Example error (Protected file):
```
Write to protected file blocked: package.json
Use /quick-implementor skill for version changes in package.json.
```

### PostToolUse (after file write)
- Runs Biome AST rules automatically
- Provides immediate feedback on violations

### Stop (before session end)
- Runs `phasegate:complete-check` (L2-L4 full validation)
- By default, the hook exits with the inner CLI's exit code, which Claude Code shows as a transcript warning but does not turn-block on.
- Set `agentIntegration.stopHook.enforce: true` in `phasegate.config.json` to enable **strict mode**: on Complete Check failure, the hook emits `{"decision":"block","reason":"Complete Check failed (exitCode=N)"}` on stdout and exits with code 2, hard-blocking Claude Code's turn end. Reentry-detection still exits 0 regardless of this setting. See `docs/guide/configuration.md` `agentIntegration` section for details.

## Git hook metadata validation

<!-- @work-item-id WI-149 -->

When installed with Husky, `.husky/pre-commit` invokes `npx phasegate pre-commit`. That path runs the same L2 pre-commit contract used by CI and includes staged Markdown metadata validation in addition to implementation metadata checks. In practice, staged `docs/inception/**/description.md` files are checked for WI frontmatter shape, `docs/product/**` reflection updates are checked for `@work-item-id WI-XXX`, and staged implementation/test files are checked for source metadata.

`validate-metadata <files>` remains available as a direct metadata command, but the public pre-commit contract for users is `phasegate pre-commit`; do not wire a separate Markdown metadata hook unless you have a project-specific reason.

## Optional Shell Script Hooks

Additional hooks can be placed in `.claude/scripts/`:

| Script | Behavior |
|--------|----------|
| deny-check.sh | Block dangerous git/bash commands (git reset --hard, rm -rf, etc.) |
| format-settings-hook.sh | Auto-format settings.json on edit |
| format-typescript-hook.sh | Auto-format TypeScript files (Biome / ESLint+Prettier) |
| analyze-errors-hook.sh | Detect tsc/lint errors on TypeScript edit |

### Hook Config

`format-typescript-hook.sh` and `analyze-errors-hook.sh` use `.claude/scripts/hook-config.json`:

```json
{
  "targetDirs": ["scripts/harness"],
  "formatter": "biome",
  "formatterArgs": ["check", "--write"]
}
```

| Field | Description | Default |
|-------|-------------|---------|
| targetDirs | Directories where hooks apply (relative to project root) | [] (skip if empty) |
| formatter | "biome" or "eslint-prettier" | "biome" |
| formatterArgs | Arguments passed to formatter | ["check", "--write"] |

Legacy `.harness-hooks.yml` and old Fuse hook files are not part of the current install lifecycle. Keep them only for archived integrations; new setup should use `install`, `doctor`, `reconcile`, `lint`, and `validate`. <!-- @work-item-id WI-157 -->
