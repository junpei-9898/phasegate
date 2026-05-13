---
traceability:
  initial_creation: true
---

# Product Unit Catalog Policy

<!-- @work-item-id WI-167 -->
<!-- @work-item-id WI-168 -->

Product Unit IDs are canonical in kebab-case. The canonical ID must match source `@unit` metadata, `docs/product/construction/{unit}/`, and public Unit naming. Underscore-named files under `docs/product/units/` are compatibility aliases or historical mirrors; they preserve old references but do not own separate product boundaries.

| File pattern | Status | Rule |
|---|---|---|
| `{kebab-unit}_unit.md` | Canonical entrypoint when present | May define or link to the active Unit boundary. |
| `{underscore_unit}_unit.md` | Compatibility alias or historical mirror | Must not contradict the kebab Unit ID or current construction docs. |
| `{unit}_unit.md` | Literal placeholder shim | Exists only for Level 1 placeholder checks and may be removed when placeholder resolution no longer needs it. |

The validator-system Unit owns the live validator ID registry. Higher-level product contracts and ADRs must not recreate an old `L2-001..L4-003`-only catalog; they should point to validator-system and the public layer guide for current L2/L3/L4 IDs.
