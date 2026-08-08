# Claude Code Hooks Integration

Phasegate integrates natively with Claude Code through its hooks system. This enables real-time quality enforcement during AI-assisted development.

## Setup

For new or existing projects, prefer `npx phasegate install --dry-run` followed by `npx phasegate install --apply` so existing hook JSON is merged instead of replaced. Manual editing is still possible, but then `phasegate doctor` may report missing managed targets until the expected PhaseGate entries, skill links, Husky scripts, CI workflow, and manifest are present. See [Setup Artifacts](setup-artifacts.md). <!-- @work-item-id WI-152 --> <!-- @work-item-id WI-169 -->

### Manual hook configuration

If structured install is unavailable, use the same packaged commands and timeout as the distributed `.claude/settings.json`:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|apply_patch",
        "hooks": [{
          "type": "command",
          "command": "npx phasegate hook pre-tool-use",
          "timeout": 30
        }]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx phasegate hook pre-tool-use",
          "timeout": 30
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx phasegate hook post-tool-use"
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "npx phasegate hook stop"
        }]
      }
    ]
  }
}
```

## Runtime coverage matrix

<!-- @work-item-id WI-385 -->

| Runtime payload | Managed source | Pre-edit deny output | Coverage boundary |
|---|---|---|---|
| Claude / Codex flat snake_case | `.claude/settings.json` / `.codex/hooks.json` | empty stdout, stderr, exit 2 | Existing contract unchanged |
| Grok flat camelCase | Claude-compatible `.claude/settings.json` | top-level deny plus `hookSpecificOutput`, stderr, exit 2 | Trust must be checked with `grok inspect` / `/hooks` |
| Antigravity nested `toolCall` | named `.agents/hooks.json` | top-level `decision` / `reason`, stderr, exit 2 | Hard block supported for `agy` CLI only |

All allow paths keep stdout empty and do not override runtime permission. Malformed, ambiguous, truncated command/patch, or supported write tools without extractable targets fail closed. L2 pre-commit and CI remain the backstops for untrusted/skipped hooks, Antigravity IDE/desktop, and unverified timeout/crash behavior.

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
- The built-in Stop hook runs the packaged PhaseGate CLI command; downstream projects do not need to provide `scripts/harness/cli/complete-check.ts`.
- By default, the hook exits with the inner CLI's exit code, which Claude Code shows as a transcript warning but does not turn-block on.
- Set `agentIntegration.stopHook.enforce: true` in `phasegate.config.json` to enable **strict mode**: on Complete Check failure, the hook emits `{"decision":"block","reason":"Complete Check failed (exitCode=N)"}` on stdout and exits with code 2, hard-blocking Claude Code's turn end. If the command cannot be invoked at all, strict mode reports `Complete Check execution failed (exitCode=N)` instead. Reentry-detection still exits 0 regardless of this setting. See `docs/guide/configuration.md` `agentIntegration` section for details. <!-- @work-item-id WI-203 -->

## Git hook metadata validation

<!-- @work-item-id WI-149 -->

When installed with Husky, `.husky/pre-commit` invokes `npx phasegate pre-commit`. That path runs the same L2 pre-commit contract used by CI and includes staged Markdown metadata validation in addition to implementation metadata checks. In practice, staged `docs/inception/**/description.md` files are checked for WI frontmatter shape, `docs/product/**` reflection updates are checked for `@work-item-id WI-XXX`, and staged implementation/test files are checked for source metadata.

`validate-metadata <files>` remains available as a direct metadata command, but the public pre-commit contract for users is `phasegate pre-commit`; do not wire a separate Markdown metadata hook unless you have a project-specific reason.

## Optional Shell Script Hooks

Additional hooks can be placed in `.claude/scripts/`:

| Script | Behavior |
|--------|----------|
| deny-check.sh | Enforce the agent command policy: git subcommands are default-deny (allowlist), plus explicit bash deny patterns (rm -rf, sudo, etc.). See [Agent git command allowlist](#agent-git-command-allowlist). |
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

## Agent git command allowlist

<!-- @work-item-id WI-253 -->

`deny-check.sh` runs as a `PreToolUse` hook on every `Bash` tool call and blocks disallowed commands by exiting with code 2. For git it uses a **default-deny allowlist** rather than an enumerated deny list.

### Why allowlist instead of deny list

An enumerated deny list always leaks. The original policy denied `git checkout*`, `git reset*`, `git merge*`, `git rebase*`, `git cherry-pick*`, `git revert*`, `git clean*`, and `git stash*`, but `git switch` was never listed — so an agent could change the working-tree/branch state through `git switch`, defeating the intent of the deny rules (no history or working-tree mutation). Overly broad globs also caused false positives: `git merge*` blocked the read-only `git merge-base`.

Inverting to an allowlist makes the policy fail closed: any git subcommand not explicitly permitted is denied, including future subcommands the deny list would not have known about.

### Allowed git subcommands

The permitted set lives in `GIT_ALLOWED_SUBCOMMANDS` in `.claude/scripts/deny-check.sh`. It covers read-only inspection, staging/commit/tag creation, and worktree/fetch operations:

```
status log show diff add commit tag restore rev-parse rev-list
merge-base branch worktree fetch grep cat-file ls-files ls-tree
ls-remote init remote describe blame shortlog
for-each-ref name-rev check-ignore check-attr
stripspace var help version whatchanged push
```

History- and working-tree-mutating subcommands are intentionally **absent** so they fail closed, including: `checkout`, `switch`, `reset`, `rebase`, `merge`, `cherry-pick`, `revert`, `stash`, `clean`, `update-ref`, `reflog`, `filter-branch`, `replace`, and `am`.

### `symbolic-ref`: read allowed, write denied (WI-269)

<!-- @work-item-id WI-269 -->

`symbolic-ref` is **not** on the plain allowlist above; it is adjudicated by a
dedicated guard (`check_symbolic_ref`), because it has both a read form and a
state-mutating write form:

- **Read (allowed)** — reports the ref that HEAD points at without changing
  anything: `git symbolic-ref HEAD`, `git symbolic-ref --short HEAD`,
  `git symbolic-ref -q HEAD`.
- **Write (denied)** — re-points HEAD, which is **checkout-equivalent HEAD
  mutation**: `git symbolic-ref HEAD refs/heads/<branch>` (a second positional
  argument), `git symbolic-ref -d HEAD` / `--delete` (removes the symbolic ref),
  and `-m <reason>` write variants.

The guard tolerates the same global-flag stuffing as the allowlist extractor, so
`git -C <path> symbolic-ref HEAD refs/heads/x` is still denied, and write forms
smuggled behind chaining/substitution operators are caught by per-segment
inspection. This closes the same class of hole as the `git switch` leak that
motivated the allowlist (WI-253): before this guard, `symbolic-ref` sat on the
allowlist and its write form re-pointed HEAD exactly like a `checkout`.

### `config`: read allowed, write denied (WI-271)

<!-- @work-item-id WI-271 -->

`config` is likewise **not** on the plain allowlist; it is adjudicated by a
dedicated guard (`check_git_config`). The write form is strictly worse than the
`symbolic-ref` hole it follows: `git config core.hooksPath <dir>` re-points the
hook path itself, which would disable the **entire L0 defence layer** (this very
hook included).

- **Read (allowed)** — `git config --get <key>`, `--get-all`, `--get-regexp`,
  `--get-urlmatch`, `--list` / `-l`, and the bare value read
  `git config <key>` (one positional argument, no value). Read forms combined
  with scope flags are legitimate and pass: `git config --global --list`,
  `git config --local --get user.name`.
- **Write (denied)** — `git config <key> <value>` (two positional arguments),
  `--unset` / `--unset-all`, `--add`, `--replace-all`, `--edit` / `-e`,
  `--remove-section`, `--rename-section`, and the new-style verb subcommands
  (`git config set|unset|edit|rename-section|remove-section ...`, git >= 2.46).

Ambiguous invocations fail closed: anything that is not a recognized read form
and carries two or more positionals is denied, so the new-style
`git config get <key>` spelling is (conservatively) denied — use the flag form
`git config --get <key>` instead. The guard tolerates the same global-flag
stuffing as the allowlist extractor (`git -C <path> config <key> <value>` is
still denied) and chained/substituted write forms are caught by per-segment
inspection.

### How the subcommand is extracted

The check tolerates global options placed before the subcommand, so evasion via flag stuffing does not bypass it. All of the following resolve to their real subcommand (`merge`, denied):

```
git merge x
git -C /repo merge x
git --no-pager merge x
git -c core.pager=cat merge x
```

Denied commands smuggled behind chaining/substitution operators (`&&`, `|`, `;`, `$( )`, subshells) are also caught, because the hook inspects each command segment independently.

### Adding a subcommand

Default-deny means a genuinely needed subcommand must be added by a human. Edit `GIT_ALLOWED_SUBCOMMANDS` in `.claude/scripts/deny-check.sh` and add the subcommand name. The block message names the rejected subcommand and points here, e.g.:

```
Security policy violation: git subcommand 'switch' is not in the agent allowlist (default-deny for git). ...
```

Note: `git push` is on the allowlist so user-directed pushes are not hard-blocked by this hook; gating pushes further (e.g. an interactive confirmation) is handled by the harness permission layer, not by `deny-check.sh`.
