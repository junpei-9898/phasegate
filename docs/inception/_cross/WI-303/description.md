---
id: WI-303
type: chore
severity: normal
status: drafted
affects: [config-foundation, validator-system, world-model]
---

# WI-303: self-repo で World enforcement を有効化する（dogfood）

> 起票日: 2026-07-17
> 起票経緯: CP-4（enforceable MVP、WM-18〜20 / WI-300〜302）合格を受け、WM-20 の実測（L2-017 = 947ms / L3-008 = 841ms、604 adopted-legacy warnings、blocking 0）に基づき self-repo の `phasegate.config.json` に `world.enabled: true` を設定する。以後この repo の L2/L3 は World constraint admission / re-derivation を実際に通す（adopted-legacy は非 blocking 表示、新規違反は fail-closed）。

検証: 有効化後 `validate --layer L2` = L2-017 WARN / overall PASS、`validate --layer L3` = L3-008 WARN / overall PASS、self-repo dogfood IT + validator usecase 99 tests green。
