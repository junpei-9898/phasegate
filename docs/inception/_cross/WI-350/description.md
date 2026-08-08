---
id: WI-350
type: fix
severity: high
status: implemented
affects: [agent-integration]
source: GitHub issue #41（Full Mode session が unit を持たないパスに効かない）
---

# WI-350: unit を持たないパスの Full Mode session 判定を per-path チェックへ委譲する

<!-- @work-item-id WI-350 -->

## 背景

`FileSystemFullModeSessionQueryAdapter.check` は集約 `input.unitId` が `undefined` の場合を即拒否していた。
`input.unitId` はプロジェクト直下のファイルや `__tests__/` 配下など、
`WriteTargetScope.fromPath` が unit を導出できないパスでは `undefined` になる。

一方、同ファイルの `allTargetPathsBelongToUnit` は「unit を導出できないパス」を許容しており、
2 つの判定が同一ファイル内で矛盾していた。結果、Full Mode session を張っても
unitless パスへの書き込み（新規ファイル作成 = feature 判定）は必ず拒否されていた。

## 修正

集約チェックは「`input.unitId` が定義済みかつ session unit と不一致」の場合のみ拒否とし、
unitless の場合は per-path チェック（`allTargetPathsBelongToUnit`）へ委ねる。
unit 付きパスが 1 つでも混在すれば per-path 側が従来どおり拒否するため、unit 境界は緩まない。
併せて本 adapter を L3-003 coverage 除外から外し（WI-348）、単体テストで挙動を固定する。
