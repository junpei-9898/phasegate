# 論理設計: docs

## WI-085 / WI-086 / WI-087 / WI-091 / WI-093 User Documentation Reflection

<!-- @work-item-id WI-085, WI-086, WI-087, WI-091, WI-093 -->
@story-id HF2-01
Documentation records user-visible behavior for configurable paths, hook setup, workspace-aware initialization, validator layer overrides, and custom design document roots. Public guidance must describe the effective runtime behavior rather than only preset defaults.

## WI-167: docs Unit Boundary

<!-- @work-item-id WI-167 -->

`docs` is a legacy product construction alias retained for historical public-documentation reflection. New documentation ownership uses the `documentation` Unit and `docs/product/construction/documentation/*` as the active construction surface. `docs/product/construction/docs/logical_design.md` must not introduce new runtime contracts or validator catalog definitions; it only preserves older WI-085..093 reflection history and points readers to the active `documentation` Unit.

<!-- @work-item-id WI-025 -->
## WI-025 Impact Note: Codex init/skills 配線は setup/documentation で出荷済み

WI-025（ISSUE-025）は `phasegate init --agent codex` が `.codex/hooks.json` のみ作成し、`.codex/skills -> ../skills` の skills 配線を欠いていた不整合を解消する issue で、`affects: [harness-api / setup, agent-integration, docs]` を宣言する。実際の実装は `scripts/harness/setup/skill-deployer.ts`（skill 実体を `skills/` に統一し `.claude/skills` / `.codex/skills` を `../skills` への symlink 化）と `scripts/harness/main.ts` の agent 別分岐、および `docs/guide/codex-integration.md` / `skills/README.md` の記述整合で出荷された。`docs` Unit への影響は、README・Codex integration guide の記述を実行時挙動（何が生成されるか）に合わせる documentation 整合のみで、`docs/product/construction/docs/` 構築サーフェスに新規の runtime contract・validator catalog は出荷されていない（WI-167 の境界を維持）。本 legacy alias 文書には設計構造を追加せず、実影響を記録するに留める。
