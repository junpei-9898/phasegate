---
id: WI-274
type: chore
severity: normal
status: completed
---

# WI-274: 過去ドキュメントの L1 ルールコード表記整合

## Context

WI-265（v0.217.0 着地）で L1 ルールコードの canonical 対応が確定した。真実の源は
`scripts/harness/biome-ast-engine/domain/.../rule-definition-registry.ts`:

| コード | ルール名 |
|-------|---------|
| `L1-006` | `no-code-duplication` |
| `L1-007` | `no-ghost-file` |
| `L1-008` | `no-comment-flood` |

WI-265 は正本 2 表（`docs/product/harness_product_overview.md`,
`docs/product/units/integration_contract.md`）を canonical に修正済み。本 WI は残る
歴史系・現在向け文書の旧 drift 表記（旧: `L1-006`=no-ghost-file / `L1-007`=no-comment-flood /
`L1-008`=no-code-duplication）の整合を扱う。

## 線引きポリシー（判断根拠）

| 文書クラス | 方針 |
|-----------|------|
| 現在の挙動を案内する文書（DEVELOPMENT.md, docs/guide/**, README 系, テンプレート） | canonical に修正 |
| 歴史記録（CHANGELOG 過去エントリ, docs/inception/ の過去 WI 文書） | 原則そのまま保存。読者を現行挙動について誤導する箇所のみ短い訂正注記 |
| ADR（docs/ADR/001, 015 等） | 本文は書き換えず、誤導的な場合のみ追記型の注記 |
| docs/principles/ | immutable。絶対に触らない（該当があれば報告のみ） |

## 全域調査結果（`grep -rn "L1-00[678]"` docs/ DEVELOPMENT.md CHANGELOG.md README.md）

### canonical と矛盾する biome ルールコード対応表記（drift）

- `docs/ADR/001-l1-biome-editor-time-enforcement.md` L25-27（drift, 現在向け参照リスクあり → 追記注記）
- `docs/ADR/015-architecture-preset.md` L132-134（drift, `flat` preset 挙動表 → 追記注記）

### canonical と一致（修正不要）

- `DEVELOPMENT.md` L447-448 — L1-007=no-ghost-file / L1-006=no-code-duplication は canonical 一致
- `docs/product/harness_product_overview.md` L739-741 — WI-265 修正済み
- `docs/product/units/integration_contract.md` L416-418 — WI-265 修正済み
- `docs/product/construction/biome-ast-engine/logical_design.md` L435-437 — canonical 一致
- `docs/product/construction/biome-ast-engine/it_test_design.md` L71-73 — canonical 一致

### スコープ外（別の error-code 名前空間 / 対応表なし）

- `docs/product/construction/config-foundation/**` の L1-006/007/008 — config-foundation
  自身の HarnessError コード（`UnknownLayerError` / `InvalidPresetDefinitionError` /
  `ConfigMergeError`）であり、biome ルールコードとは別系統。無関係。
- `docs/product/construction/harness-error/unit_test_logic.md` の L1-006/007/008 — 汎用
  fixture コードで、ルール名との対応付けは存在しない。無関係。
- `L1-001〜L1-008` の範囲表記（各種 test design / logical design）— 対応付けを含まない範囲記述。

### 歴史記録（残置。誤導性が低いため注記不要と判断）

- `CHANGELOG.md` L1164/1175/1179/1188/1191/1193/1258/1264/1290 — ISSUE-003 当時の作業記録。
  当時の CLI 表示（旧 mapper）に整合した記述であり、過去の事実として保存。過去エントリ内で
  完結しており現行挙動を案内する文脈ではないため、注記なしで残置。
- `docs/inception/_cross/WI-003/**`, `WI-014`, `WI-015`, `WI-016`, `WI-017`, `WI-265`,
  `docs/inception/biome-ast-engine/**`, `docs/inception/_operation/status_audit_*.md`,
  `docs/inception/share/**` — 過去 WI/監査文書。当時の記述として保存。WI-003 の
  description は既に「実コード定義と食い違う」旨の当時注記を持ち、WI-265 description は
  canonical を明記済みで、いずれも誤導性は低いため残置。

## Acceptance Criteria

- [x] 現在向け文書に canonical と矛盾する対応表記が 0 件（DEVELOPMENT.md は元々一致、
      guide/README/templates/skills に drift なし）
- [x] ADR-001 / ADR-015 に追記型の訂正注記を付す（本文の対応表は当時の記述として保存）
- [x] 歴史記録は残置
- [x] docs/principles/ は不変（該当ヒットなし）
- [x] `npx tsx scripts/harness/main.ts validate --layer L2` PASS
