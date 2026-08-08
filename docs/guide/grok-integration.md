# Grok Build Integration

<!-- @work-item-id WI-385 -->

Phasegate uses Grok Build's Claude-compatible project hook scanner. It manages `.claude/settings.json` as the single hook source and deliberately does not create `.grok/hooks`, avoiding duplicate invocation.

Minimum supported runtime: the hook-capable Grok CLI 1.0.0 series, which is the series used to verify this integration. If hooks appear to be silently inactive, run `grok inspect` and confirm the project hook is loaded and trusted in `/hooks`.

## Setup

```bash
npx phasegate install --agent grok --with-husky --apply
npx phasegate doctor --agent grok
```

The managed PreToolUse entries collectively match `Bash|Write|Edit|apply_patch`; each Phasegate command has an explicit 30-second timeout. Grok otherwise defaults a hook to 5 seconds and fails open when the hook times out or crashes, so the distributed timeout gives Phasegate enough time to inspect a write while L2 pre-commit remains the backstop. `run_terminal_command`, `search_replace`, `write`, and `apply_patch` camelCase payloads are normalized to the existing Bash/Write/Edit/patch pipeline. Grok truncates tool input at 128 KB; a truncated command or patch is denied because the full target set cannot be proven. A direct tool with a complete path can still be checked.

## Result contract

- Deny writes top-level `{ "decision": "deny", "reason": ... }` and Claude-compatible `hookSpecificOutput` to stdout, writes the reason to stderr, and exits 2.
- Allow exits 0 with empty stdout and does not override permission.
- Agent/model fields and the selected install target are not authorization inputs.

## Trust and residual risk

Project hooks can be skipped before trust is approved, and Phasegate cannot inspect Grok's external trust state. Run `grok inspect`, open `/hooks`, and approve with `--trust` or `/hooks-trust`. Keep L2 pre-commit and CI enabled because timeout/crash remains fail-open even with the explicit 30-second limit. The canonical path key for every future Grok `write` variant remains runtime-controlled; unknown supported-write shapes fail closed rather than silently allowing.
