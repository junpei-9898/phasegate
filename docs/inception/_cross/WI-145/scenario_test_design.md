---
traceability:
  initial_creation: true
work_item: WI-145
---

# Scenario Test Design: WI-145

> **WI**: WI-145
> **Unit**: installation
> **作成日**: 2026-05-11
> **参照**: `description.md`, `logical_design.md`, `it_test_design.md`

## 1. シナリオ方針

@work-item-id WI-145

Scenario test はユーザー価値として読める end-to-end の流れを検証する。WI-145 では自動修復は非スコープのため、doctor が silent failure を発見し、次 action を判断できる情報を返すことを主眼にする。

## 2. User Scenarios

@work-item-id WI-145

| Scenario ID | シナリオ | Given | When | Then |
|---|---|---|---|---|
| SC-WI145-001 | 既存導入 PJ の inert installation を発見できる | phasegate devDep はあるが hooks / husky / CI / skills が未配線 | ユーザーが `phasegate doctor` を実行する | exitCode 1、red finding 一覧、repair hint または suggested skill が表示される |
| SC-WI145-002 | 正常導入 PJ は不要な不安を出さない | manifest と全 deploy 先が整合している | `phasegate doctor` を実行する | exitCode 0、green status、findings なし |
| SC-WI145-003 | JSON 出力を CI や別ツールが消費できる | inert installation fixture | `phasegate doctor --json` を実行する | stable schema の JSON が stdout に出る |
| SC-WI145-004 | warn only の問題を strict CI で fail にできる | CI workflow 欠落のみの PJ | `phasegate doctor --strict` を実行する | exitCode 1、warn finding が保持される |
| SC-WI145-005 | report file を opt-in で残せる | partial install PJ | `phasegate doctor --report-out .phasegate/last-doctor-report.json` を実行する | stdout と report file の双方で同じ診断内容を確認できる |
| SC-WI145-006 | 後続 WI のコマンドは誤って成功しない | 任意の PJ | `phasegate install/uninstall/reconcile` を実行する | 未実装であることを明確に返し、既存 file を変更しない |

## 3. Acceptance Mapping

@work-item-id WI-145

| 受け入れ基準 | Scenario | 補完 test |
|---|---|---|
| manifest schema round-trip | SC-WI145-002 | `IT-WI145-INF-002`, `UT-WI145-DM-007` |
| manifest 不存在は null、壊れた JSON は error | SC-WI145-001 | `IT-WI145-INF-001`, `IT-WI145-INF-003` |
| atomic save | SC-WI145-002 | `IT-WI145-INF-004`, `IT-WI145-INF-005` |
| doctor inert-install は非ゼロ | SC-WI145-001 | `IT-WI145-CLI-002` |
| doctor full-install はゼロ | SC-WI145-002 | `IT-WI145-CLI-001` |
| `--json` schema | SC-WI145-003 | `IT-WI145-CLI-005`, `UT-WI145-UC-007` |
| repair hint / suggested skill | SC-WI145-001 | `UT-WI145-HC-*`, `UT-WI145-UC-006` |
| strict warn fail | SC-WI145-004 | `IT-WI145-CLI-006`, `UT-WI145-UC-004` |
| RepairTable 9 entries | SC-WI145-001 | `UT-WI145-DM-017` |
| Clean Architecture 依存方向 | SC-WI145-006 | L1/L2 validation |

## 4. Non-Goals

@work-item-id WI-145

- `phasegate install --apply` による自動修復完了は WI-146 の scenario に移す。
- `phasegate uninstall` の manifest archive と reverse operation は WI-147 の scenario に移す。
- `phasegate reconcile` の差分適用と init deprecation は WI-148 の scenario に移す。
