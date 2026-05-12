---
id: WI-124
type: issue
severity: normal
status: tested
affects: [ci-governance, validator-system, config-foundation]
source: internal
---

# WI-124: CI template generation must use the live validator registry

> 起票日: 2026-05-09
> 起票経緯: CI template generation review で、ValidatorIdRegistryAdapter が stub list を返しており、実際の validator-system registry と CI template の対象 validator がずれる可能性を確認した。

## 背景

PhaseGate は validator-system 側に L1〜L4 の validator 定義を持ち、`list-errors` でも 20 definition を表示できる。一方、CI template generation 側の validator id registry は一部の stub ID のみを返しており、生成される CI template が実際の validator surface を反映しない可能性がある。

これは CI template 新機能ではなく、既存 CI 生成機能を現行 validator registry と同期させる品質改善である。

## 本 WI でやること

1. ci-governance の ValidatorIdRegistryPort を validator-system の live registry または共通 registry source に接続する。
2. preset / config に応じて CI template の対象 validator が決まるようにする。
3. disabled / strictOnly / scheduled L4 の扱いを CI template に反映する。
4. `list-errors` / `validate --layer all` / generated CI の validator set が食い違わないことを検証する。
5. consumer project で生成される template の snapshot test を追加する。

## 受け入れ基準

- [ ] CI template generation が stub validator list に依存しない。
- [ ] generated CI が L2-L4 contract と WI-107 の L4 skip/advisory policy に一致する。
- [ ] preset ごとの差分が template に反映される。
- [ ] `list-errors` の validator registry と CI template の対象 validator に説明可能な対応関係がある。
- [ ] registry package dogfood で generated CI template の validator set を確認できる。

## 関連

- WI-107: CI/L4 execution semantics must be unified
- WI-108: `phasegate:ci-check` must match its documented L2-L4 contract
- WI-116: README roadmap must be reconciled with implemented L4-004/L4-005 validators
