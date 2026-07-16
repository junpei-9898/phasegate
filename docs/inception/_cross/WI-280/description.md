---
id: WI-280
type: chore
severity: normal
status: drafted
affects: [world-model, traceability-model, validator-system, config-foundation, harness-api, attestation, agent-integration, phase2-extensions, nyquist-validation, ci-governance, regression-suite]
source: internal
---

# WI-280: World Model 導入の実行計画

<!-- @work-item-id WI-280 -->

World Model を「型付き有向事実に対する端点対称の制約再評価」として導入するため、Phase 0 の意思決定、cross-cutting WI 分割、並列 worktree の衝突境界、統合チェックポイント、MVP 切断線を確定する計画 WI。

本 WI は計画のみを所有し、World Model の product 反映・実装・テストを直接行わない。各実装項目は `delivery_plan.md` の計画内 ID をもとに、実行開始時に inception 全体で一意な `WI-XXX` を採番し、`docs/inception/_cross/{WI-XXX}/` へ `type: story` として起票する。

実装 WI はすべて story-implementor の新機能経路を使い、Phase 1 の設計と承認、affects 全 Unit の product construction 反映、Phase 2 の TDD 実装の順序を守る。

