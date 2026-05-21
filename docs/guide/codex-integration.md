# Codex CLI Integration

Phasegate supports [OpenAI Codex CLI](https://developers.openai.com/codex/cli) through its hooks system, providing quality enforcement similar to the Claude Code experience. Because Codex's hook coverage differs from Claude's, defense is layered across hook-time and commit-time mechanisms.

## Setup

### Quick setup (recommended)

```bash
# 1. Initialize the project for Codex
npx phasegate init --name my-project --agent codex --with-husky

# 2. Enable the Codex CLI feature flag manually
codex features enable hooks
```

For dual-agent projects (Claude + Codex), use `--agent both`.

Responsibility split:

- `phasegate init --agent codex` sets up **project-local artifacts** such as `phasegate.config.json`, `skills/`, `.codex/hooks.json`, and `.codex/skills`
- `codex features enable hooks` updates the **Codex CLI user environment** and is intentionally left as a manual step

### Manual setup

Alternatively, set up Codex integration manually:

#### 1. Enable hooks in Codex config

Add to `~/.codex/config.toml` (or project `.codex/config.toml`):

```toml
[features]
hooks = true
```

#### 2. Install Phasegate hooks

Copy the template into your project:

```bash
mkdir -p .codex
cp node_modules/phasegate/templates/.codex/hooks.json .codex/hooks.json
```

Or merge the following into your existing `.codex/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "npx phasegate hook pre-tool-use",
            "statusMessage": "phasegate: pre-tool-use check"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "npx phasegate hook post-tool-use",
            "statusMessage": "phasegate: post-tool-use lint"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx phasegate hook stop",
            "statusMessage": "phasegate: completion check",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

#### 3. Enable the pre-commit hook (critical for Codex)

Because Codex's native `apply_patch` tool does not trigger hooks (see [Codex's limitation](#known-limitations)), the pre-commit layer is the primary defense for apply_patch-based edits. Install via husky:

```bash
npx phasegate init --with-husky  # or rerun init with this flag
```

## Defense Layers in Codex

Compared to Claude Code, the enforcement timing is shifted for `apply_patch`-based edits. Coverage is equivalent overall but arrives at different stages.

| Concern | Claude Code | Codex |
|---|---|---|
| Bash-based file writes (`sed -i`, `tee`, heredoc) | `PreToolUse(Bash)` — hard block | `PreToolUse(Bash)` — hard block (same) |
| Bash-invoked `apply_patch <<'PATCH'` | `PreToolUse(Bash)` — hard block | `PreToolUse(Bash)` — hard block (via Wave 1 `apply_patch` heredoc detection) |
| **Native `apply_patch` tool calls** | `PreToolUse(Write\|Edit)` — hard block | ⚠️ **Not intercepted by hooks** — deferred to pre-commit |
| Protected file writes | hook — immediate block | hook (Bash path) + pre-commit (commit path) |
| Phase-gate enforcement | hook — immediate block | hook (Bash path) + pre-commit (commit path) |
| Post-edit formatter / lint | `PostToolUse(Write\|Edit)` | `PostToolUse(Bash)` (partial) |
| Session completion check | `Stop` hook | `Stop` hook (same) |

## Known Limitations

### Native `apply_patch` bypasses hooks

Per [OpenAI Codex docs](https://developers.openai.com/codex/hooks):

> "Currently `PreToolUse` only supports Bash tool interception."

Codex's native `apply_patch` tool is routed through a separate `ApplyPatchHandler` (see [openai/codex#16732](https://github.com/openai/codex/issues/16732)) that never emits hook events. As a result:

- Phasegate cannot pre-block edits made through native `apply_patch`
- Violations surface at **pre-commit time** instead
- Feedback is delayed relative to the Claude Code experience

**Mitigation**: commit frequently (e.g., after each logical unit of work). This shortens the window between violation and detection.

### Bash-invoked `apply_patch` is fully covered

If the model invokes `apply_patch` via a Bash command (`apply_patch <<'PATCH' ... PATCH`), `PreToolUse(Bash)` fires and Phasegate's `BashWriteTargetExtractor` parses the heredoc to identify target files. This path is hard-blocked like any other Bash write.

### Windows is not supported

Codex hooks themselves do not support Windows. Phasegate follows the same constraint.

### `unified_exec` interception is incomplete

Codex documents that the newer `unified_exec` mechanism has incomplete interception. Commands routed through `unified_exec` may bypass hooks. Phasegate falls back to pre-commit for any such bypass.

## Recommended Workflow

1. **Enable all three layers**: Codex hooks + pre-commit hook + CI validation
2. **Commit frequently** to catch native apply_patch violations early
3. **Review the coverage matrix** above so you understand which edits are hard-blocked vs caught later

## Troubleshooting

### Hooks don't seem to run

- Verify `hooks = true` is set in `config.toml`
- Verify `.codex/hooks.json` is in the project root or `~/.codex/`
- Run `codex --version` to ensure you're on a version that supports hooks

### False positives on Bash hooks

If non-write Bash commands are being blocked, check your `phasegate.config.json` `protectedFiles.exclude` list. You can also disable the `PostToolUse(Bash)` hook if lint runs too frequently.

### Native apply_patch violations slipped through

This is expected behavior until [openai/codex#16732](https://github.com/openai/codex/issues/16732) is fixed. The pre-commit layer will catch these at commit time. If immediate feedback is critical, consider instructing the model (via project-level context) to prefer Bash-based edits over native `apply_patch`.

## See Also

- [Claude Code Hooks Integration](./hooks-integration.md)
- [Phasegate Layer Model](./layer-model.md)
- [Codex Hooks Documentation (official)](https://developers.openai.com/codex/hooks)
