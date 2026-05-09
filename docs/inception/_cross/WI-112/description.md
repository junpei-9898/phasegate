---
id: WI-112
type: issue
severity: normal
status: implemented
affects: [harness-api, validator-system]
source: internal
---

# WI-112: `phasegate:status` must report trustworthy, non-stale state

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、direct validator run 後でも `phasegate:status --json` が L2 `unknown` / L4 disabled を返し、lint / complete-check failure と整合しないことを確認した。

## 背景

`phasegate:status` は gate command ではなく health summary であるため、fail 状態でも exit 0 でよい。しかし summary の中身は、利用者が現在の状態を判断できる程度に信頼できる必要がある。

現状では configuration state、last artifact state、live validation state が混ざり、どの状態を表示しているのか分かりづらい。

## 本 WI でやること

1. `phasegate:status` が表示する状態を configuration / cached artifact / live validation に分解して定義する。
2. `phasegate:lint` / `phasegate:complete-check` の failure と status summary の関係を明確にする。
3. L4 disabled が「設定上 disabled」なのか「直近実行結果がない」のかを区別する。
4. WI-107 / WI-108 の layer policy と CI behavior を反映する。

## 受け入れ基準

- [x] status 出力が configuration state と validation result state を区別する
- [x] direct validator run 後の状態が stale / unknown のままに見えない
- [x] `phasegate:lint` または `phasegate:complete-check` failure が、status summary と矛盾しない
- [x] status が情報表示 command として exit 0 を維持する場合、その理由が docs と test に残る

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
- WI-107: CI/L4 execution semantics must be unified
- WI-108: `phasegate:ci-check` must match its documented L2-L4 contract
