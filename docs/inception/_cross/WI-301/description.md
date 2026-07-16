---
id: WI-301
type: story
severity: high
status: drafted
affects: [validator-system, world-model, config-foundation]
source: internal
---

# WI-301: L2-017 World constraint admission fast-path

<!-- @work-item-id WI-301 -->

## 背景

ADR-037は`L2-017 world-constraint-admission`をPhase Cのlocal fast-pathとして予約した。WM-18でresolved `world` config projectionが利用可能になったため、validator-systemへdefinition、RunL2 wiring、blocking policyを登録できる。一方、self-repoでは`world.enabled`が既定falseであり、既存pre-commitを予告なく重くしたり、604件のadoption baselineをblockingへ戻してはならない。

## 目的

- `L2-017`をregistryとRunL2へ正規登録する。
- `world.enabled:false`ではdefinitionを残したまま明示skipする。
- Worldのpure derive結果をpublic facade越しに観測し、blocking policyだけをvalidator-systemが所有する。
- malformed constraint、new pin / claimに由来する新規structural findingを初日からfail-closedにする。
- adopted legacyとactive waiverは可視warningに保ち、local結果がauthoritativeでないことを明記する。

## 受け入れ基準

- `ValidatorId`、default registry、golden catalogに`L2-017 world-constraint-admission`が一意に存在する。
- resolved `world.enabled:false`では`L2-017`が`skipped:true`となり、World evaluatorを呼ばない。
- `world.enabled:true`ではmalformed / unsupported constraint declarationをerrorとして返す。
- baseline外のnew pin / unpinned claim findingを`new-structural` / `invalid-declaration`としてerrorにする。
- `adopted-legacy`はfingerprint / WCR ruleを伴うwarningとして表示し、既定`failOnWarning:false`でblockingしない。
- HarnessErrorはlocal fast-pathが偽造可能であり、authoritative判定は後続`L3-008`のclean re-derivationであると説明する。
- H17-14をtestと同じ着地で`planned -> required`へ進める。

## 非目標

- `L3-008`の登録、clean checkout再導出、CI authoritative policy
- self-repo `phasegate.config.json`の`world.enabled:true`化
- baseline / waiver / debt lifecycleの変更
- World WCR evaluator、fingerprint、report schemaの変更

## 運用

このWIではself-repoのautomatic World gateを有効化しない。WM-20でL3-008が揃った後、CP-4のdual-path検証結果を根拠に別のreviewed config変更として判断する。
