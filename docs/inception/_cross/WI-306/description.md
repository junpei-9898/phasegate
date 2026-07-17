---
id: WI-306
type: story
severity: high
status: drafted
affects: [attestation, world-model, harness-api]
source: internal
---

# WI-306: Attestation v2 World snapshot root pin

<!-- @work-item-id WI-306 -->

## 背景

ADR-033はWorldのcanonical `corpusRoot`を再導出可能なsnapshot identityとし、attestation projectionから将来の`worldSnapshotRoot` self-referenceを除外すると決定した。現行attestation v1はgate result、input digest、granularityを封印するが、その実行時に観測したWorld snapshotをpinしない。

## 目的

- `phasegate-attestation/v2`へplain `worldSnapshotRoot`を追加し、canonical payloadで封印する。
- top-level compositionがworld-model public facadeからrootを取得してattestationへ注入し、Unit間循環を作らない。
- fragment digestやWorld domain型をattestation recordへ複製しない。
- v1のproduce / verifyを無期限に読み取り可能な互換契約として維持する。

## 受け入れ基準

- v2は`schemaVersion: phasegate-attestation/v2`、`predicateType: https://phasegate.dev/attestation/gate-run/v2`、必須`worldSnapshotRoot: sha256:<64hex>`で判別できる。
- v1は`worldSnapshotRoot`を持たず、既存provider未配線のproduceと既存record verifyが従来どおり成功する。
- v2 rootはattestationDigestのcanonical preimageへ含まれ、改竄をverifyが検出する。
- v2 schemaはfragment ID / path / digest配列を持たず、root一件だけをpinする。
- CLI compositionはWorld public facadeが返すplain DTOをproviderとして注入し、attestationからworld-modelをimportしない。
- World owner projectionはv1 / v2を受理し、v2の`worldSnapshotRoot`をcorpusRoot計算から除外する。
- v1 / v2双方のproduce→verify E2Eとv1回帰テストがgreenである。
- H17-18をtestと同じ着地で`required`として登録する。

## 非目標

- fragment digestのattestation保存
- verify時にcurrent World rootとの一致を要求すること（attestationは実行時snapshotを証明する）
- WCR、baseline、waiver、L2-016の契約変更
- signed modeや鍵管理の実装

## coexistence

v1 verifyとprovider未配線のv1 produceは廃止期限を設けず維持する。top-level CLIはWorld providerを配線してv2を生成する。v1削除は別ADR / major contract changeなしには行わない。
