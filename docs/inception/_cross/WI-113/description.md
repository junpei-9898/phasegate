---
id: WI-113
type: issue
severity: normal
status: implemented
affects: [harness-api, validator-system]
source: internal
---

# WI-113: CLI output format contract should reject or support JSON consistently

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、`validate --layer L2 --format json` / L3 / L4 が `json` を受け付ける一方で human output を出すことを確認した。

## 背景

`validate` help は `--format human|agent|ci` を示しているが、実際には `--format json` が拒否されず human output が返る。CLI contract と実行結果が一致しないため、automation から見ると parse failure を起こす。

これは JSON 出力という新機能の追加要求ではなく、未対応 format を受け付けてしまう契約違反である。

## 本 WI でやること

1. `validate --format json` を正式対応するか、invalid option として fail-fast するかを決める。
2. 現時点で JSON を実装しない場合、`json` 指定時に clear error と non-zero exit を返す。
3. JSON を実装する場合、L2 / L3 / L4 / all で同じ schema を返す。
4. help / README / CLI reference と実装を一致させる。

## 受け入れ基準

- [x] `validate --format json` が human output を返さない
- [x] 未対応 format の場合は clear error と non-zero exit になる
- [x] 対応 format の一覧が help / docs / parser 実装で一致する
- [x] `validate --layer L2|L3|L4 --format <unsupported>` の regression test がある

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
- WI-107: CI/L4 execution semantics must be unified
- WI-108: `phasegate:ci-check` must match its documented L2-L4 contract
