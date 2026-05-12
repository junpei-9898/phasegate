---
id: WI-111
type: issue
severity: normal
status: tested
affects: [validator-system]
source: internal
---

# WI-111: CLI command E2E coverage validator needs reliable command-to-test mapping

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、既存 CLI E2E suite に見える command まで未カバーとして報告され、gating signal として信頼しづらいことを確認した。

## 背景

CLI command E2E coverage validator は、未テストの CLI command を検出するための重要な signal である。しかし現状では、既存 suite に存在する command も missing として報告される可能性がある。

これは新検出器ではなく、既存検出器の matching 品質と false positive の問題である。

## 本 WI でやること

1. validator が command 定義と E2E test をどう対応付けているかを調査する。
2. alias、package script 名、main CLI command 名、fixture 経由実行を区別できる matching rule を定義する。
3. true missing coverage と matching limitation を別の分類で報告する。
4. WI-110 で layer ownership を確定した後、その layer の gating signal として使える品質にする。

## 受け入れ基準

- [x] 既存 E2E suite に実在する command が missing として報告されない
- [x] command alias / package script / direct CLI invocation の対応付けルールが文書化されている
- [x] 未判定ケースは false positive として fail するのではなく、limitation として区別される
- [x] validator の fixture test が true positive / true negative / alias case を含む

## 実装メモ

- E2E test file の path だけではなく content を読み、`run('command')` / `runInCwd(..., 'command')` / help usage / unknown-command assertion を coverage evidence として扱う。
- consumer project に PhaseGate 内部 CLI E2E suite が存在しない場合は、L2-013 を `limitation` として扱い、package 利用者の L2 gate を誤って失敗させない。
- PhaseGate self repository のように CLI E2E suite が存在する場合は、真に未カバーの command を `missing` として fail する。

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
- WI-110: L1/L2 validator ownership and execution boundary must be corrected
