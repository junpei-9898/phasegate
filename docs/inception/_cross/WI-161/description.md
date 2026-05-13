---
id: WI-161
type: issue
severity: high
status: drafted
affects: [validator-system, biome-ast-engine, config-foundation, documentation]
source: internal
---

# WI-161: G5 Operational Validator Product Contract Reconciliation

> 起票日: 2026-05-12
> 起票経緯: WI-119 / WI-120 / WI-121 / WI-134 / WI-135 の G5 operational validator 仕様を、product construction の主設計へ統合するため。

## スコープ

- L3-001 security token family / redaction / allowlist / fixture policy
- L3-002 performance smell / suppression / standard-vs-strict behavior
- L3-002 hidden knobs: `largeLiteralEntries`, sync I/O, loop-await, suppression marker
- L4-003 real import/export graph, re-export, wildcard export, dynamic import, public API boundary, generated/test/fixture exclusion
- L4-002 side-effect capability boundary
- L4-002 decision placement advisory
- `architecture.capabilityPolicies` / `architecture.decisionPolicies` の recommended preset / override example

## 主要成果物

- `docs/product/construction/validator-system/*`
- `docs/product/construction/biome-ast-engine/*`
- `docs/product/construction/config-foundation/*`
- `docs/product/construction/documentation/*`
- `docs/guide/layer-model.md`
- `docs/guide/configuration.md`

## 受け入れ基準

- [ ] `ArchitectureConfig` / presets が capability policy と decision responsibility を正式に持つのか、validator-side default policy なのかが明確。
- [ ] dead-code graph の false positive boundary が product docs と coverage report に反映される。
- [ ] L3 security/performance の report payload、suppression、redaction の読み方が public docs に出る。
- [ ] performance/security/dead-code の report payload と config knobs が schema, config guide, product docs の間で矛盾しない。

## 依存

`WI-159`。
