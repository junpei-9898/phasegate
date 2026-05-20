# Domain Model: Story full-mode authorization

<!-- @work-item-id WI-206 -->

## Concepts

| Concept | Definition |
|---|---|
| Full-mode-required change | A write target that Quick Mode classification says should not be handled as an ad-hoc change. Examples include domain model edits, API contract changes, and new domain files. |
| Story implementation route | The AIDLC route represented by `/story-implementor`, including planning, design checks, TDD implementation, and verification. |
| Hook-visible authorization | Machine-readable state that PreToolUse can inspect before deciding whether to block a full-mode-required write. |
| Full-mode session | A time-limited authorization record that permits declared categories for a declared Unit and WI. |
| Design-doc bypass | The existing ISSUE-021 compatibility rule that bypasses full-mode block when required product docs for the Unit exist. |
| Manual category relaxation | Direct or managed expansion of `quickMode.allowedCategories`. This is a recovery mechanism, not the preferred story implementation route. |

## Invariants

- A markdown skill guide is not an authorization artifact.
- Hook authorization must be derived from product docs, approved WI state, explicit session state, or managed config state.
- A full-mode session must include a finite expiry.
- A full-mode session must include the target Unit and work item.
- Expired, malformed, or unrelated sessions must not permit writes.
- Manual category relaxation must not be the only path for legitimate story implementation.

## Policy Decisions To Make

| Decision | Options |
|---|---|
| Session storage | `.phasegate/session.json`, `.phasegate/sessions/<id>.json`, or external agent runtime state |
| Session closure | Explicit `session end`, stop hook auto-close, expiry-only, or combined |
| Authorization source | Session-only, product-doc approved-only, or session plus product-doc evidence |
| Allowed categories | Fixed full-mode layer set or derived from WI scope |
| Audit output | JSONL event log, session file history, or hook skip event integration |
