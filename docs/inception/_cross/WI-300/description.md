---
id: WI-300
type: story
severity: high
status: tested
affects: [config-foundation, world-model, validator-system, harness-api]
source: internal
---

# WI-300: World config surface and resolved mapping

<!-- @work-item-id WI-300 -->

## 背景

World Modelの明示commandはADR-037のcanonical defaultsで動作しているが、現行のconfig-foundationから渡される値はlegacy `paths`由来のdesign / inception / matrix pathに限られる。Phase CのL2-017 / L3-008、session-start、control declaration pathを単一のresolved contractから安全に消費するため、v2 / v3 schema、preset、domain validation、consumer mapperを同じWIで追加する。

## 目的

- top-level `world` configをADR-037 §6 / §7の全fieldで公開する。
- minimal / standard / strictの全presetでcanonical defaultsを解決する。
- explicit `world:*` commandと将来のvalidator integrationへplain DTOを渡す。
- configが存在する場合のunknown field、invalid path、root role衝突、limit違反をfail-closedにする。

## 受け入れ基準

- v2 / v3 schemaが同じ`world` contractを受理し、unknown fieldとinvalid valueを拒否する。
- resolved configはsource overrideをpresetへdeep mergeし、legacy `paths.designDocs` / `paths.inceptionDocs` / `layers.L3.requirementMatrixPath`を明示World値がない場合だけ継承する。
- three presetsはrollout互換性のため`world.enabled: false`を既定とし、その他はADR-037 canonical defaultsを共有する。
- config-foundation public mapperが完全なWorld DTOを返し、mainの明示commandは`enabled: false`でも従来どおり実行する。
- validator-system mapperは将来のWM-19 / WM-20が読むWorld DTOを伝搬するが、L2-017 / L3-008をregistryやvalidator配列へ追加しない。
- H17-13をtestと同じ着地で`planned -> required`として登録する。

## スコープ外

- L2-017 / L3-008のValidatorId、registry、use case、composition wiring
- automatic validatorの実行・blocking policy
- session-start表示とattestation v2
- presetによる`world.enabled`の自動有効化
