# WI-306 Domain Model: Versioned World root attestation

<!-- @work-item-id WI-306 -->

## AttestationRecord

既存aggregateにoptional `worldSnapshotRoot: Digest | null`を加える。schema discriminatorとrootの不変条件は次のとおり。

| schema | predicate | root |
|---|---|---|
| `phasegate-attestation/v1` | `.../gate-run/v1` | absent |
| `phasegate-attestation/v2` | `.../gate-run/v2` | required SHA-256 digest |

v2 rootはcanonical payloadとequalityへ含める。metadata / signatureと違いvolatileではない。v1でrootがある、v2でrootがない、schema / predicateが対応しないrecordはmalformedである。

## WorldSnapshotRootProvider

attestation applicationが所有するconsumer-side port。`getWorldSnapshotRoot(): Promise<string>`だけを持ち、WorldのSnapshot / Digest / usecase型を公開しない。provider不在はv1互換produce、providerありはv2 produceとなる。provider失敗や不正digestはrecordを書かずusage / infrastructure failureとしてexit 2にする。

## WorldSnapshotRootFacade

world-model application public facade。current corpusを`BuildSnapshot`で再導出し、`{ schemaVersion, worldSnapshotRoot }`のplain immutable DTOだけを返す。top-level compositionがこのfacadeをproviderへadaptする。

## Invariants

- rootはcanonical `corpusRoot`であり、`constraintRoot` / `evaluationId`ではない。
- attestation recordはfragment digest collectionを所有しない。
- v2 rootの改竄はattestationDigest不一致になる。
- Worldのattestation projectionはrootをsemantic projectionへ含めずself-referenceを防ぐ。
