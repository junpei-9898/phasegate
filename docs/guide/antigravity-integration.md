# Google Antigravity CLI Integration

<!-- @work-item-id WI-385 -->

Phasegate manages a named `phasegate-gate` definition in `.agents/hooks.json`. User-owned named definitions are preserved; install and reconcile replace only the Phasegate-owned key, and uninstall removes only that key from a merged file.

Minimum supported runtime: Antigravity CLI v1.0.14, where hooks are available; Phasegate verification targets `agy` 1.1.x. If the gate appears silently inactive, open `agy`, run `/hooks`, and confirm `phasegate-gate` is loaded. Project skills are exposed through `.agents/skills`, which Phasegate links to the shared `skills/` catalog.

## Setup

```bash
npx phasegate install --agent antigravity --with-husky --apply
npx phasegate doctor --agent antigravity
```

The PreToolUse regular expression covers `write_to_file`, `replace_file_content`, `multi_replace_file_content`, and `run_command`, invoking `npx phasegate hook pre-tool-use` with a 30-second timeout. Nested `toolCall.name` / `toolCall.args` payloads accept defensive path candidates (`TargetFile`, `targetFile`, `target_file`, `filePath`, `file_path`, `path`), content candidates, and command candidates (`CommandLine`, `command`, `Command`). These candidate keys are compatibility inputs, not claims that every runtime/version has been verified. Missing targets or commands fail closed.

## Result contract

- Deny writes only documented top-level `decision: "deny"` and `reason` fields to stdout, writes the reason to stderr, and exits 2.
- Allow exits 0 with empty stdout and does not override permission.
- Workspace cwd uses `workspacePaths[0]`, falling back to the hook process cwd.

## Supported surface and residual risk

Pre-edit hard blocking is supported for the terminal `agy` CLI surface. Antigravity IDE/desktop hook execution is not guaranteed and is not advertised as protected; L2 pre-commit is the primary defense there. The exact args keys across releases, the meaning of exit code alone, and timeout/crash failure semantics remain unverified runtime behavior. Keep L2 pre-commit and CI enabled and inspect loaded hooks with `/hooks`.
