# WI-190 Domain Model

## Concepts

- **Managed markdown section**: A bounded block between `phasegate:managed-section` markers owned by install/reconcile/refresh commands.
- **Agent context renderer**: The command, preset, skill, and user-section value set used to fill AGENTS.md / CLAUDE.md templates.
- **Idempotency**: Running refresh and then reconcile must leave managed context content unchanged unless external input changed.

## Invariants

- CLAUDE.md managed-section rendering uses one command/skill/preset/default-user-section contract across refresh and reconcile.
- User-owned content inside user-section markers is preserved.
