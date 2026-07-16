# WI-290 Logical Design: Runtime / evidence extractor adapters

<!-- @work-item-id WI-290 -->

@story-id H17-05

## 1. Package layout

```text
scripts/harness/world-model/infrastructure/adapters/
├── runtime-fact-extraction.ts
├── json-fact-extractor-support.ts
├── type-script-source-fact-extractor.ts
├── source-metadata-fact-extractor.ts
├── test-reference-source-fact-extractor.ts
├── matrix-fact-extractor.ts
├── attestation-fact-extractor.ts
└── integrity-manifest-fact-extractor.ts
```

`WorldNode`にはADR-032で確定済みのTestReference projection factoryを追加する。新node typeやID形式は追加しない。

## 2. Dependency flow

```text
TypeScript filesystem bytes
  -> source metadata line parser
  -> SourceFile WorldNode

owner JSON bytes
  -> strict JSON / exact-field admission
  -> owner public DTO projection
  -> canonical sort / WorldHashingPort
  -> generated / external Artifact + TestReference nodes

attestation public verify handler
  -> VerifyAttestationOutput
  -> attestation verificationStatus
```

provider importはnyquist-validation / attestationのpublic `index.ts`だけとし、ci-governance integrityはversioned external file contractを読む。provider domain / application internal / infrastructureへdeep importしない。

## 3. Source extraction

- `readdir`をPathKey順に再帰走査し、regular `.ts`だけを読む。symlinkはfollowしない。
- shared extractorへ`sourceKind`とpath predicateを渡し、implementation / testを重複抽出しない。
- exact line / JSDoc metadataからUnit / layer / canonical WI IDsを抽出する。
- missing / duplicate required metadataはSourceFileを保持したままdiagnosticにし、metadata欠落を不可視化しない。

## 4. JSON admission

- UTF-8 decode / JSON parse failure、array / scalar rootをdiagnostic。
- owner schemaごとにrequired key / allowed keyを列挙する。
- matrixは1.0 / 1.1、attestationは`phasegate-attestation/v1`、integrityはversion 1だけをadmitする。
- optional fileのENOENTは`not-present`、他I/O errorは`provider-read-failure`。
- semantic projectionをCanonicalJsonSerializerでbytes化し、WorldHashingPortでdigestする。

## 5. Attestation public ACL

`AttestationVerificationHandlerAdapter`はpublic verify handlerを`emitJson: true`で呼び、公開`VerifyAttestationOutput`へ変換する。extractorはraw recordを公開`AttestationDocument`契約で検証し、public statusと組み合わせる。attestation mapper / repository / domain VOをimportしない。

## 6. TDD sequence

1. RED: source classification、matrix canonicalization、attestation volatile exclusion、integrity / not-present fixture testを追加する。
2. GREEN: shared result / JSON support、source extractors、TestReference factory、matrix、attestation ACL、integrityの順に実装する。
3. REFACTOR: owner sort、unknown-field rejection、public import boundary、no-new-crypto、composition / index不変を監査する。
