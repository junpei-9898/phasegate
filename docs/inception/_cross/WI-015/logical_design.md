# Logical Design: WI-015

<!-- @work-item-id WI-015 -->

## Scope

Quick Mode must distinguish comment-only or whitespace-only edits from API contract edits when the target path is `*port.ts` or `*adapter.ts`.

## Design

- `ChangedFile` carries optional `beforeContent` and `afterContent`.
- `CommentOnlyDiffDetector` strips TypeScript comments and whitespace while preserving string literal content, then compares the remaining source.
- `QuickModeJudgmentEngine` classifies comment-only diffs as `docs` before applying the `*port.ts` / `*adapter.ts` API rule.
- `API_CONTRACT` rejection ignores files that have a comment-only diff.
- Agent integration passes edit contents to the quick-mode full-mode check when the hook payload includes enough information.

## Compatibility

Missing content keeps the previous path-only behavior. No `phasegate.config.json` schema change is required.
