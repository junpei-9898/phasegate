# WI-291 Logical Design: Snapshot assembly と inspect CLI

<!-- @work-item-id WI-291 -->

@story-id H17-06

## 1. Package layout

```text
scripts/harness/world-model/
├── application/
│   ├── dto/world-inspection-dto.ts
│   ├── ports/world-fact-source-port.ts
│   └── usecases/{build-snapshot,inspect-world}-use-case.ts
├── infrastructure/adapters/
│   ├── attestation-sha256-world-hashing-adapter.ts
│   ├── assembled-world-fact-source.ts
│   ├── composite-design-fact-source.ts
│   └── traceability-world-read-facade-merger.ts
├── presentation/cli/world-inspect-command-handler.ts
├── composition-root.ts
└── index.ts
```

## 2. Dependency flow

```text
main.ts
  -> config-foundation LoadResolvedConfigUseCase
  -> plain WorldResolvedConfigInput | undefined
  -> world-model composition root
  -> all design/runtime/evidence extractors
  -> AssembledWorldFactSource
  -> BuildSnapshotUseCase
  -> InspectWorldUseCase
  -> WorldInspectCommandHandler
```

composition rootだけがconcrete extractor / provider moduleを生成する。applicationは`WorldFactSourcePort`とdomain serviceへ依存し、filesystem / provider型へ依存しない。

## 3. Resolved config mapping

config不在時はADR-037 §7のcanonical defaultsを使う。config存在時はraw JSONを読まず、mainがconfig-foundation use caseのresolved DTOをplain inputへ変換する。

WM-18までは`world` schemaを先取りしないため、既存resolved fieldだけを使う。

- canonical `docs/product`を維持し、`paths.designDocs`がその外なら追加product scopeとして解決する。
- `paths.inceptionDocs`をinception rootにする。
- `layers.L3.requirementMatrixPath`をmatrix pathにする。
- ADR / source / attestation / integrityはcanonical defaults。

invalid configはdefaultsへfallbackせずhandlerへexecution failureとして渡す。`world.enabled`はWM-18まで未実装であり、明示commandをskipしない。

## 4. Composition

- `createSha256Capability()`を`AttestationSha256WorldHashingAdapter`へ注入する。
- `createTraceabilityModelModule(...).worldReadFacade`をdesign ACLへ注入する。
- product scopeごとのtraceability plain DTOをstable dedupしてowner indexへまとめ、product / Unit sourceを追加scopeも含めて束ねる。
- proposal / ADR、source / test、matrix / attestation / integrityを同じfact sourceへ束ねる。
- attestation verificationはpublic `createAttestationModule(...).verifyAttestationHandler`だけを使う。
- `SnapshotRootDeriver`へcanonical serializerとWorld hashing portを注入する。

provider内部port / VO、`node:crypto`、validator-systemをimportしない。

## 5. CLI handler

受理flagは`--format human|json`と`--json`だけ。

- default human
- `--json` = `--format json`
- `--json --format human`、unknown flag、missing / invalid formatはexit 2
- JSONは単一`phasegate-world-cli/v1` envelope
- humanはSummary → Inventory → Diagnostics → Next actionの固定順
- primary resultはstdout、human usage / execution errorはstderr
- JSON expected errorはstdout envelope

handlerはfilesystem writerを持たず、inspect実行前後にwriteしない。

## 6. Main / harness-api synchronization

同じ着地点で次を更新する。

- `main.ts` top-level help / subcommand help / `case "world:inspect"`
- `KNOWN_HARNESS_COMMANDS`のsorted entry
- known-command conformance test
- CLI E2E

`world:pin` / `world:derive`のcaseやknown-command entryは追加しない。
