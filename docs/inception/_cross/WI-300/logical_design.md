# WI-300 Logical Design: World config resolution

<!-- @work-item-id WI-300 -->

## Resolution pipeline

```text
phasegate.config.json
  -> AJV v2/v3 schema
  -> preset World defaults + source world override
  -> legacy paths inheritance when corresponding world field is omitted
  -> WorldConfig invariant validation
  -> HarnessConfig resolved plain document
       -> toWorldModelConfig() -> explicit world:* composition
       -> toValidatorSystemConfig().world -> WM-19/20 automatic gates
```

## Preset decision

minimal / standard / strictは同じADR-037 canonical World documentを持ち、`world.enabled`は全て`false`とする。これはdefense強度ではなくPhase C automatic integrationのrollout switchであり、strictだけを先行有効化すると既存consumerで新しいblocking gateが予告なく有効になるためである。明示commandは全presetで常時実行可能。WM-24以降にdefault enablementを変える場合は別WI / migrationでreviewする。

## Mapper placement

完全なWorld contractは`config-foundation/application/mappers/world-model-config-mapper.ts`に置く。World固有のcorpus / declarations / outputを`validator-system-config-mapper.ts`へ混在させず、mainのtop-level compositionがpublic mapperを呼ぶ。一方、将来validatorが同じresolved inputを使えるよう`toValidatorSystemConfig()`はplain `world` projectionも返す。両mapperはconfig-foundation domain型を公開しない。

## Legacy field inheritance

- `world.corpus.productRoots`省略時、canonical `docs/product`に加え、`paths.designDocs`から導出したcustom product rootを追加する。
- `world.corpus.inceptionRoots`省略時、`paths.inceptionDocs`を使う。
- `world.inputs.matrixPath`省略時、`layers.L3.requirementMatrixPath`を使う。
- 明示World fieldがある場合はlegacy fieldで上書きしない。

## Hotspot boundary

このWIはconfig schema / preset / mapperとmainのconfig注入だけを変更する。validator registry、known IDs、RunL2 / RunL3、World gate adapterは変更しない。
