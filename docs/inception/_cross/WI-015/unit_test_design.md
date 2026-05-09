# Unit Test Design: WI-015

<!-- @work-item-id WI-015 -->

## Cases

| ID | Target | Expected |
|---|---|---|
| WI015-UT-001 | `ChangedFile.create` | Stores optional before/after content. |
| WI015-UT-002 | `CommentOnlyDiffDetector` | Returns true for line comment, block comment, JSDoc, metadata comment, and whitespace-only changes. |
| WI015-UT-003 | `CommentOnlyDiffDetector` | Returns false for interface signature changes. |
| WI015-UT-004 | `CommentOnlyDiffDetector` | Does not treat `//` or `/* */` inside strings as comments. |
| WI015-UT-005 | `QuickModeJudgmentEngine` | Classifies comment-only `*port.ts` edits as `docs`. |
| WI015-UT-006 | `QuickModeJudgmentEngine` | Keeps real `*port.ts` changes rejected as `API_CONTRACT`. |
