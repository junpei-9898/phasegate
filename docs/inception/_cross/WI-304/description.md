---
id: WI-304
type: story
severity: high
status: drafted
affects: [agent-integration, world-model]
source: internal
---

# WI-304: SessionStart open World obligations summary

<!-- @work-item-id WI-304 -->

## 背景

CP-4でL2-017 / L3-008によるWorld enforcementが成立し、self-repoでは`world.enabled:true`が有効化された。ADR-037はSessionStartにcurrent open obligationsの限定要約を表示し、保存済みreportを正本として信頼せず、最大5件 / 2000文字、blocking優先、fail-openを要求する。self-repoには604件の`adopted-legacy`があるため、個別列挙するとprompt budgetと実装者の注意を消費する。

## 目的

- agent-integrationのSessionStart経路へWorld obligationsのplain context DTO / usecase / presentationを追加する。
- world-model public compositionからcurrent obligationsをpure再導出するconsumer-owned query adapterを追加する。
- blocking相当、cleanup-required、waivedを決定的に優先表示し、adopted legacyは件数だけ表示する。
- hard cap 5件 / 2000 Unicode scalar valuesと決定的な省略表示を保証する。
- World無効時は沈黙し、derive不能時は固定一行warningへfail-openしてsessionを継続する。

## 受け入れ基準

- `WorldObligationsQueryPort`がworld-model public `createWorldModelModule`だけを利用し、内部port / repository / domain型へdeep importしない。
- `world.enabled:false`または`world.sessionStart.enabled:false`ではWorld queryを呼ばず、additionalContextへWorld sectionを追加しない。
- `new-structural` / `invalid-declaration` / expired waiverを先、cleanup-required、waivedの順にし、同順位はrule ID / constraint ID / fingerprintで決定的に並べる。
- adopted legacyは個別entryへせず`Adopted legacy: N`の件数一行だけにする。
- 表示entryは最大5件、World section全体は最大2000 Unicode scalar、途中切断なし、省略数を決定的に表示する。
- constraint / waiver / debtのreason、details、prose、full reportをhook contextへ中継しない。
- derive失敗は固定一行warning、hook exit 0としてsessionをblockしない。
- H17-16をtestと同じ着地で`planned -> required`へ進める。

## 非目標

- L2 / L3 blocking policy、WCR、baseline / waiver lifecycleの変更
- persisted obligation reportの読み込みまたはcache authority化
- agent-integrationの設計変更event / commit-msg統合（WM-22）
- session-startからcontrol declarationを変更すること

## 運用

summaryはnavigation aidでありauthorityではない。修復判断と完全な確認には`phasegate world:derive`、authoritative gateにはL3-008を使う。
