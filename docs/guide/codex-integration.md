# Codex CLI Integration

<!-- @work-item-id WI-384 -->

Phasegate supports OpenAI Codex CLI through project-local command hooks. Codex rust-v0.124.0 or newer is required for native `apply_patch` coverage; hooks are stable and enabled by default in those releases.

## Setup

Install or reconcile the managed Codex artifacts:

```bash
npx phasegate install --agent codex --with-husky --apply
npx phasegate doctor --agent codex
```

Use `--agent both` for projects shared with Claude Code. After `.codex/hooks.json` is created or changed, open `/hooks` in Codex and trust the current hook definition hash. Trust is stored outside the project and cannot be verified by Phasegate, so install, reconcile, and doctor print an operator notice.

The deprecated `phasegate init --agent codex` path remains available and prints the same minimum-version and re-trust guidance.

### Manual configuration

The canonical matcher is `Bash|apply_patch` for both events:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|apply_patch",
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
        "matcher": "Bash|apply_patch",
        "hooks": [
          {
            "type": "command",
            "command": "npx phasegate hook post-tool-use",
            "statusMessage": "phasegate: post-tool-use lint"
          }
        ]
      }
    ]
  }
}
```

`Write` and `Edit` aliases are not included in the Codex-specific template. `apply_patch` is the canonical upstream tool name.

## Coverage

| Edit path | Pre-edit hard block | Post-edit lint | Commit-time backstop |
|---|---|---|---|
| Shell writes (`sed -i`, `tee`, heredoc, `cat >`) | ✅ `PreToolUse(Bash)` | ✅ `PostToolUse(Bash)` | ✅ L2 pre-commit |
| Bash-invoked `apply_patch <<'PATCH'` | ✅ parsed by `BashWriteTargetExtractor` | ✅ `PostToolUse(Bash)` | ✅ L2 pre-commit |
| Native `apply_patch` Update/Add/Delete/Move to | ✅ `PreToolUse(apply_patch)` | ✅ `PostToolUse(apply_patch)` | ✅ L2 pre-commit |

For native patches, Phasegate reads raw patch text from `tool_input.command`, preserves directive order, and maps Update/Add/Delete to MODIFY/CREATE/DELETE. An Update followed by `*** Move to:` adds the source as MODIFY and the destination as CREATE. All targets join the existing protected-file, phase-gate, story-reflection, and Quick/Full Mode checks. One violating target denies the whole patch before editing.

PostToolUse intentionally does not parse patch targets again. It sends the event through the existing fast lint path.

## Hook result contract

- Deny: exit 2 with non-empty stderr.
- Continue: exit 0 with empty stdout. Informational stderr is allowed.
- Phasegate does not emit `permissionDecision: "ask"` because that path can fail open.
- Phasegate does not emit an `allow` response without `updatedInput`.
- Missing `tool_input.command` or a patch without `*** Begin Patch` fails closed.

## Layered defense and residual risk

Command hooks are a fast path. They can be skipped until the updated definition is trusted, and project code cannot inspect Codex's external trust store. Keep `.husky/pre-commit` and CI enabled: L2 remains the commit-time backstop and CI remains the authoritative re-check.

Codex CLI 0.144.5 still exposes `unified_exec`, whose interception coverage is incomplete. Commands routed through an unobserved `unified_exec` path may bypass the edit-time hook; L2 pre-commit and CI remain the fallback for that residual risk.

Windows Codex hooks and Codex versions older than 0.124.0 are not supported by this integration.

## Troubleshooting

### Native apply_patch is not intercepted

1. Run `codex --version` and confirm 0.124.0 or newer.
2. Confirm both matchers in `.codex/hooks.json` are `Bash|apply_patch`.
3. Run `npx phasegate doctor --agent codex`.
4. Run `npx phasegate reconcile --apply` if doctor reports stale wiring.
5. Open `/hooks` and trust the current definition hash.

### A patch is denied

Read stderr for the blocked path and recovery guidance. Full Mode changes require an active `phasegate session begin --mode full ...` authorization. Malformed or target-less native patches are denied rather than silently allowed.

## See also

- [Hooks Integration](./hooks-integration.md)
- [Layer Model](./layer-model.md)
- [OpenAI Codex hooks documentation](https://developers.openai.com/codex/hooks)
- [openai/codex PR #18391](https://github.com/openai/codex/pull/18391)
