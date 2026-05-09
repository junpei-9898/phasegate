# IT Test Design: WI-015

<!-- @work-item-id WI-015 -->

## Cases

| ID | Target | Expected |
|---|---|---|
| WI015-IT-001 | `ClassifyChangeCategoryUseCase` | Accepts target changes with before/after content and returns `docs` for comment-only `*port.ts` edits. |
| WI015-IT-002 | `QuickModeFullModeRequirementAdapter` | Forwards target change content to quick-mode classification. |
| WI015-IT-003 | `HandlePreToolUseUseCase` | Calls the full-mode port with `targetChanges` so hook-origin diff data reaches quick-mode. |
