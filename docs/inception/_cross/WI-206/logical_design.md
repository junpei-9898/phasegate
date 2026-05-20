# Logical Design: Hook-visible story full-mode route

<!-- @work-item-id WI-206 -->

## Scope

This WI should make the `/story-implementor` guidance actionable for changes that are intentionally outside Quick Mode, without requiring users to hand-edit `quickMode.allowedCategories`.

## Current Flow

1. PreToolUse receives an Edit / Write event.
2. Quick Mode classification marks the target as `domain`, `application`, `infrastructure`, or another category outside `allowedCategories`.
3. `HandlePreToolUseUseCase` returns `FULL_MODE_REQUIRED`.
4. The error message suggests `/story-implementor`.
5. `/story-implementor` can create or require design docs, but it does not create hook-visible full-mode state.
6. The implementation Edit / Write reaches step 2 again and is rejected unless product docs already trigger ISSUE-021 bypass or the user manually relaxes config.

## Target Flow

1. `/story-implementor` Phase 1 prepares and reflects required design evidence.
2. `/story-implementor` Phase 2 starts a hook-visible full-mode session for a specific Unit and WI.
3. PreToolUse validates the session before applying full-mode-required blocking.
4. Allowed edits are constrained to the declared Unit, layer categories, duration, and reason.
5. Stop hook or explicit command closes the session and records audit evidence.

## Candidate Mechanism

Add a session elevation command:

```bash
phasegate session begin --mode full --unit <unit> --work-item WI-XXX --reason "<reason>" --duration 1h
phasegate session end --work-item WI-XXX
```

Session state can be stored under `.phasegate/session.json`:

```json
{
  "mode": "full",
  "unit": "integrations",
  "workItemId": "WI-206",
  "allowedCategories": ["domain", "application", "infrastructure", "presentation", "config"],
  "reason": "story-implementor Phase 2 implementation",
  "startedAt": "2026-05-20T00:00:00.000Z",
  "expiresAt": "2026-05-20T01:00:00.000Z"
}
```

## Guardrails

- Expired sessions must fail closed.
- Session scope must not allow unrelated Units.
- Session state must be auditable and easy to remove.
- A skill name alone must not be sufficient authorization.
- Product docs existence bypass should remain a separate compatibility path until a stronger WI approval model exists.

## Guidance Improvements

When `checkDesignDocsExist(unitId)` is false, the block message should identify the missing artifact and suggest the matching scaffold phase. For example, if `logical_design.md` exists but `domain_model.md` is missing, suggest:

```text
scaffold: npx phasegate scaffold-design --unit integrations --phase domain
```

When design docs exist but no session is active, suggest the session command rather than implying that invoking `/story-implementor` alone changes hook behavior.
