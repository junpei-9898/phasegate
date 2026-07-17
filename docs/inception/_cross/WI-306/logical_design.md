# WI-306 Logical Design: Attestation v2 composition

<!-- @work-item-id WI-306 -->

## Flow

```text
phasegate:attest top-level dispatch
  -> resolved World config
  -> createWorldModelModule(...).worldSnapshotRootFacade.read()
  -> plain sha256 string
  -> createAttestationModule(..., worldSnapshotRootProvider)
  -> ProduceAttestationUseCase
       provider absent  -> v1 (legacy public composition compatibility)
       provider present -> v2 + worldSnapshotRoot
  -> AttestationRecord.seal()
  -> atomic repository write
```

attestation sourceはworld-modelをimportしない。harness-api/top-level compositionだけが双方のpublic `index.ts`を参照する。

## Version admission

mapperはv1 / v2だけを受理し、schemaVersion、predicateType、root presenceを一組として検証する。v2 rootは`Digest`で形状検証する。unknown schema、version/predicate mismatch、v1 root混入、v2 root欠落は`L1-053` malformedとしてverify exit 2となり、empty / v1へfallbackしない。

## Canonical payload

v1 preimageは既存bytesを変えない。v2 preimageは既存semantic fieldsに`worldSnapshotRoot`を一件追加する。fragment hash、World node、absolute path、generatedAtは追加しない。World側owner projectionはv2をparseするがroot、signature、self digest、volatile metadataを投影から除外する。

## Coexistence decision

- schemaVersion: `phasegate-attestation/v2`
- predicateType: `https://phasegate.dev/attestation/gate-run/v2`
- v1 read / verify: indefinite support
- v1 produce: provider未配線のprogrammatic compositionで維持
- v2 produce: top-level CLIの既定（World provider配線時）

既存v1 consumerへ暗黙fieldを追加しないため、v1 documentは完全に従来shapeのままとする。
