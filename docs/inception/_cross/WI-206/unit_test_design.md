# Unit Test Design: Story full-mode route

<!-- @work-item-id WI-206 -->

## Regression Cases

| ID | Target | Condition | Assertion |
|---|---|---|---|
| UT-WI206-001 | `HandlePreToolUseUseCase` | `domain` edit, `checkDesignDocsExist=false`, no session | Blocks with `FULL_MODE_REQUIRED` and does not imply skill invocation alone is sufficient. |
| UT-WI206-002 | `HandlePreToolUseUseCase` | `domain` edit, valid full-mode session for same Unit and WI | Allows the write or returns a distinct session-authorized result. |
| UT-WI206-003 | `HandlePreToolUseUseCase` | valid session exists but target Unit differs | Blocks with `FULL_MODE_REQUIRED`. |
| UT-WI206-004 | `HandlePreToolUseUseCase` | session is expired | Blocks and reports session expiry. |
| UT-WI206-005 | guidance builder | Unit has `logical_design.md` but lacks `domain_model.md` | Suggests `scaffold-design --phase domain`, not `--phase logical`. |
| UT-WI206-006 | story skill integration contract | `/story-implementor` Phase 2 preamble is documented | Includes managed session begin / end commands, not manual `allowedCategories` editing. |

## Existing Coverage To Preserve

| Existing behavior | Evidence |
|---|---|
| Required design docs can bypass full-mode block | ISSUE-021 integration tests in `handle-pre-tool-use-usecase.test.ts` |
| Missing design docs keep blocking | ISSUE-021 negative integration test |
| `phasegate.config.json` recovery uses `quick-mode-relax` when config is blocked | WI-204 config-plan guidance tests |

## E2E Smoke

Create a temporary project or use a non-baselined under-designed Unit and verify:

1. Without session, `domain` Edit is rejected with `FULL_MODE_REQUIRED`.
2. After `phasegate session begin --mode full --unit <unit> --work-item WI-XXX --duration 15m`, the same Edit is accepted.
3. After `phasegate session end` or expiry, the same Edit is rejected again.
