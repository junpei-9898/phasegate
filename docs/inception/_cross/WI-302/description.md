---
id: WI-302
type: story
severity: high
status: drafted
affects: [validator-system, world-model, config-foundation]
source: internal
---

# WI-302: L3-008 authoritative World constraint re-derivation

<!-- @work-item-id WI-302 -->

## 背景

ADR-030はCIのL3再検証をauthoritative trust rootとし、ADR-035 / ADR-037は保存済み`.harness/world-obligations.json`を非信頼のgenerated artifactと定める。WM-19の`L2-017`はlocal fast-pathとして新規World違反を早期表示するが、working treeとlocal control inputは改竄できるため、enforceable MVPにはclean CI corpusから独立再導出する`L3-008`が必要である。

## 目的

- `L3-008 world-constraint-rederivation`をregistryとRunL3へ正規登録する。
- current corpusとversioned control declarationsからWorld obligationを毎回pure再導出する。
- 保存reportの欠落、改竄、古さに判定を依存させない。
- `new-structural` / `invalid-declaration`をfail-closedにし、adopted legacy / active waiverは可視かつnon-blockingに保つ。
- `world.enabled:false`ではdefinitionを残したまま明示skipし、trueの場合だけauthoritative再導出する。

## 受け入れ基準

- `ValidatorId`、default registry、golden catalogに`L3-008 world-constraint-rederivation`が一意に存在する。
- resolved `world.enabled:false`では`L3-008`が`skipped:true`となり、World re-derivation portを呼ばない。
- `world.enabled:true`では保存reportを読まず、current corpus、constraints、baseline、waiver、debtからobligationを再導出する。
- base fixtureはPASSし、structural mutationは期待`WCR-NNN`とfingerprintを含むerrorでFAILする。
- malformed / unsupported control inputをemptyへfallbackせずauthoritative errorにする。
- adopted legacy / active waiverはfingerprint付きwarningとして表示し、既定`failOnWarning:false`ではblockingしない。
- reportの作成、改竄、削除前後でL3-008のserialized resultとblocking結果が不変である。
- H17-15をtestと同じ着地で`planned -> required`へ進める。

## 非目標

- self-repo `phasegate.config.json`の`world.enabled:true`化
- adoption baseline、waiver、debt、WCR rulesetの変更
- L2-017のlocal fast-path契約の拡張
- CI workflow / templateへの最終組込み（WM-24）

## 運用

このWIではself-repo configを変更しない。L2-017 / L3-008のdual-pathを一時的なresolved configで実測し、CP-4でautomatic World gateの有効化可否を判断する。
