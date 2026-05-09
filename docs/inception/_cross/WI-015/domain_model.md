# Domain Model: WI-015

<!-- @work-item-id WI-015 -->

## quick-mode

| Concept | Kind | Responsibility |
|---|---|---|
| ChangedFile | Value Object | Holds file path, change kind, and optional before/after content for classification. |
| CommentOnlyDiffDetector | Domain Service | Determines whether a TypeScript/JavaScript source change only changes comments or whitespace. |
| QuickModeJudgmentEngine | Domain Service | Downgrades comment-only API-path edits to `docs` and keeps real API edits rejected. |

## agent-integration

| Concept | Kind | Responsibility |
|---|---|---|
| FullModeTargetChange | DTO | Carries target path and optional before/after content across the hook boundary. |
| PreToolUse hook adapter | Presentation Adapter | Extracts `old_string` / `new_string` for Edit and disk/new content for Write when available. |

## Invariants

- A real signature or exported API change in `*port.ts` / `*adapter.ts` remains `API_CONTRACT`.
- A comment-only or whitespace-only edit with before/after content is `docs`.
- If before/after content is absent, classification remains path-based.
