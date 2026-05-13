# 論理設計: docs

## WI-085 / WI-086 / WI-087 / WI-091 / WI-093 User Documentation Reflection

<!-- @work-item-id WI-085, WI-086, WI-087, WI-091, WI-093 -->
@story-id HF2-01
Documentation records user-visible behavior for configurable paths, hook setup, workspace-aware initialization, validator layer overrides, and custom design document roots. Public guidance must describe the effective runtime behavior rather than only preset defaults.

## WI-167: docs Unit Boundary

<!-- @work-item-id WI-167 -->

`docs` is a legacy product construction alias retained for historical public-documentation reflection. New documentation ownership uses the `documentation` Unit and `docs/product/construction/documentation/*` as the active construction surface. `docs/product/construction/docs/logical_design.md` must not introduce new runtime contracts or validator catalog definitions; it only preserves older WI-085..093 reflection history and points readers to the active `documentation` Unit.
