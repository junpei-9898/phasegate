# WI-283 Logical Design: World snapshot canonicalization と version roots

<!-- @work-item-id WI-283 -->

## 1. 現行実装の調査結果

| surface | 実装根拠 | 現行挙動 | Worldへの適用 |
|---|---|---|---|
| attestation canonical JSON | `attestation-record.ts` | object key recursive sort、array order保持、空白なし | 基本serializer ruleを採用。ただしWorld-local serviceとして所有 |
| attestation content hash | `content-hasher-port.ts`, `node-crypto-content-hasher-adapter.ts` | UTF-8 stringをSHA-256、attestation `Digest`を返す | public capabilityはplain digestを返し、World adapterがlocal VOへ変換 |
| attestation file digest | `file-system-source-digester-adapter.ts` | `readFile` raw bytesをSHA-256 | raw-byte hashingの既存事実。Worldから直接importしない |
| integrity digest | `file-system-sha256-hasher-adapter.ts`, `integrity-manifest.ts` | raw bytes→64 lowercase hex、path昇順 | integrity owner contractを維持。World rootとは別digest lifecycle |
| matrix | `generate-requirement-test-matrix-usecase.ts`, `file-system-generated-matrix-adapter.ts` | `generatedAt`を毎回生成し、pretty JSONで保存 | owner-aware projectionで`generatedAt`を除外し、semantic arraysをsort |
| attestation volatile field | `AttestationRecord.toCanonicalPayload()` | `producedAt`, `gitCommit`, signature blockをself-digestから除外 | generic key dropではなくowner projectionという先例を採用 |

既存コードにはattestation content / attestation file / ci-governance integrity / installationで複数の`node:crypto` SHA-256呼び出しがある。WM-03は既存debtを一括統合せず、World用の新しい呼び出しを増やさない。

## 2. Canonicalization pipeline

```text
filesystem / provider DTO
  -> artifact-kind / owner schema projection
  -> path + text / JSON / binary normalization
  -> leaf canonical bytes
  -> leaf digest
  -> World node / edge / diagnostic projection
  -> semantic set sorting
  -> recursive-key canonical JSON
  -> root preimage bytes
  -> SHA-256 capability
```

各stageでparse / normalization errorを`ExtractionDiagnostic`として保持し、silent omissionしない。

## 3. Content normalization

### 3.1 UTF-8 text / prose

1. bytesをfatal UTF-8 decodeする。
2. CRLFをLF、残るlone CRもLFへ変換する。
3. Unicode normalizationは行わない。
4. BOM、trailing whitespace、final newline、zero-width characterを含む他code pointは保持する。
5. UTF-8へencodeしてleaf bytesとする。

Markdown explicit FragmentはADR-032のheading startから次marker直前までを入力とする。marker metadataのdigest包含は、identity factsとして別canonical fieldへ入れる。prose content digestへmarker lineを混ぜない。

### 3.2 Structured JSON

- UTF-8 decode / JSON parse。
- owner schemaでsemantic fieldだけをDTOへproject。
- missingとexplicit `null`を区別。
- object key / string valueへUnicode normalizationを適用しない。
- unknown field policyはowner schemaに従い、silent field dropではなくdiagnostic。
- object keyはserializerがsort。
- set-valued collectionはowner adapterがstable IDでsort。
- ordered arrayはpreserve。

matrix projection:

- include: matrix schema version、Story / AC / TestReference semantic fields。
- exclude: `generatedAt`。
- sort: stories by Story ID、AC mappings by AC ID、testReferences by ADR-032 TestReference ID。

attestation projection:

- includeするevidence factとverification statusはattestation public DTOが定義する。
- exclude: `producedAt`, `gitCommit`, producer package version、signature bytes、attestation self-digest、future `worldSnapshotRoot` self-reference。
- ownerのgate result / validator outcome等を含める場合もstable IDsでsortする。

### 3.3 Binary / symlink

- extractorがbinaryとして宣言したartifactだけraw bytes modeを使う。extensionだけでbinary推定しない。
- textとして宣言されたartifactのinvalid UTF-8はdiagnostic。
- symlink entryは`lstat` / `readlink`相当でlink target stringを観測し、targetをfollowしない。
- symlink targetがrepository外、broken、cycleでもtraversalせずfact / diagnosticとして記録する。

## 4. Path normalization

- project-relative POSIX lexical path。
- `./`と重複separatorを除去。
- absolute path、drive letter、backslash、`..`を拒否。
- configured corpus root自体もproject-relativeで記録する。
- `realpath` / absolute checkout rootをID / root preimageへ入れない。
- exact caseを保持しcase-sensitiveに比較する。
- case-foldしたpathが衝突する場合はportability diagnosticを出し、merge / winner選択しない。
- Unicode path normalizationは行わず、ADR-032 PathKeyをopaque identity scalarとして使う。
- filesystem列挙後はPathKeyでsortしてからextractする。

## 5. Canonical JSON

### 5.1 Object

- 全階層でkeyをECMAScript string ascending orderにsort。
- key / string escapingとnumber renderingは`JSON.stringify` semantics。
- whitespace / indentation / trailing newlineなし。
- invalid JSON valueはexception / diagnostic。undefinedをdropしない。

### 5.2 Array

serializerはarray orderを変更しない。

| array semantics | pre-serialization rule |
|---|---|
| World nodes | Node ID |
| edges | edge type, from ID, to ID, canonical qualifier |
| diagnostics | code, node ID, PathKey, line, canonical payload |
| constraints / claims / aliases | respective stable ID |
| matrix stories / AC / refs | Story ID / AC ID / TestReference ID |
| owner-defined ordered steps | original owner order |

sort comparatorはlocaleに依存さずcanonical ASCII ID / PathKeyのcode-unit orderを使う。

## 6. Root derivation

### 6.1 Corpus root

```json
{
  "schemaVersion": "phasegate-world-snapshot/v1",
  "extractorVersion": "phasegate-world-extractor/v1",
  "corpusConfigDigest": "sha256:<hex>",
  "nodes": [],
  "edges": [],
  "extractionDiagnostics": []
}
```

`corpusRoot = sha256(canonicalBytes(envelope))`。

Snapshot IDは`pgw:v1:snapshot:sha256:<corpusRoot hex>`。constraints、aliases、evaluation、obligationsは含めない。

### 6.2 Constraint root

```json
{
  "schemaVersion": "phasegate-world-constraints/v1",
  "rulesetVersion": "phasegate-world-ruleset/v1",
  "constraintConfigDigest": "sha256:<hex>",
  "constraints": [],
  "explicitClaims": [],
  "aliases": [],
  "declarationDiagnostics": []
}
```

`constraintRoot = sha256(canonicalBytes(envelope))`。

Aliasはendpoint resolution semanticsを変えるためconstraint sideへ置く。corpusRootをconstraint declaration変更で変化させない。

### 6.3 Evaluation ID

```json
{
  "schemaVersion": "phasegate-world-evaluation/v1",
  "rulesetVersion": "phasegate-world-ruleset/v1",
  "corpusRoot": "sha256:<hex>",
  "constraintRoot": "sha256:<hex>",
  "evaluationConfigDigest": "sha256:<hex>",
  "policyInputsDigest": "sha256:<hex>"
}
```

preimageをSHA-256し、`pgw:v1:evaluation:sha256:<hex>`とする。findings / obligations / report / blocking resultを含めない。

## 7. Version / relevant config

| value | root / ID | bump / change condition |
|---|---|---|
| snapshot schemaVersion | corpusRoot | node / edge canonical shape変更 |
| extractorVersion | corpusRoot | corpus selection / parse / normalization semantics変更 |
| constraint schemaVersion | constraintRoot | declaration canonical shape変更 |
| rulesetVersion | constraintRoot + evaluationId | rule interpretation / evaluator behavior変更 |
| evaluation schemaVersion | evaluationId | evaluation preimage shape変更 |
| corpusConfigDigest | corpusRoot | corpus roots / include-exclude / extractor option変更 |
| constraintConfigDigest | constraintRoot | declaration location / rule parameter変更 |
| evaluationConfigDigest | evaluationId | evaluation semanticsを変えるresolved option変更 |
| policyInputsDigest | evaluationId | baseline / waiver等immutable policy input変更 |

relevant config digestはfull config fileのraw hashではない。resolved defaults込みのscope-specific DTOをcanonical JSON化してhashする。output format / output directory、UI limit、validator-system blocking / severity、unrelated layer configは除外する。

## 8. Explicit exclusions

generic field nameでdropせず、各owner adapterのversioned projectionで除外する。

- clock: `generatedAt`, `producedAt`, duration
- location: absolute root / cwd / temp path / realpath
- process: PID / host / user / inode / mtime
- VCS / deployment: git commit, package version, `skills/.harness-version`, deployedAt
- derived output: findings / obligations / obligation report / human or JSON formatter output
- self reference: corpusRoot / Snapshot ID / constraintRoot / evaluationId / attestation self-digest / future worldSnapshotRoot

schemaVersion / extractorVersion / rulesetVersionはsemantic version inputsなので除外しない。

## 9. Hashing capability boundary

### 9.1 Final owner

最終配置は**attestation public facade**とする。新shared Unit / shared domain typeは作らない。

理由:

- 既存`NodeCryptoContentHasherAdapter`とcomposition root / public `index.ts`がある。
- ADR-031はworld-model infrastructureからattestation public surfaceへの一方向依存を許可済み。
- shared public contractを新設すると、hash primitiveだけの新ownership / product design / dependency rootが増える。

### 9.2 Public contract

attestation public surfaceはattestation `Digest`を返さないplain capabilityを公開する。

```text
Sha256Capability.hashBytes(bytes: Uint8Array): "sha256:<64 lowercase hex>"
```

必要なら`hashUtf8(text)`は`TextEncoder`後に`hashBytes`へ委譲する。WM-06で既存`NodeCryptoContentHasherAdapter`の`createHash`呼び出しをこのcapability実装へ移動または公開し、同じprimitiveをattestation local adapterとworld-model adapterが使う。

### 9.3 Consumer adapters

```text
attestation ContentHasherPort
  <- attestation-local adapter
  <- public Sha256Capability

world-model WorldHashingPort
  <- world-model/infrastructure adapter
  <- public Sha256Capability
```

- world-modelはattestation domain / application / infrastructure classをdeep importしない。
- public facade / plain string contractだけをimportする。
- attestation / world-modelは結果を各local Digest VOへ変換する。
- `FileSystemSourceDigesterAdapter` / ci-governance integrity等の既存hash実装統合はWM-06の必須scopeに広げない。
- World導入のための新しい`node:crypto`呼び出しは追加しない。

## 10. Failure behavior

- unsupported schema / extractor / ruleset version: fail-closed diagnostic
- invalid UTF-8 text: extraction diagnostic
- invalid canonical JSON value: canonicalization diagnostic
- absolute / traversal path: path diagnostic
- case-fold collision / duplicate ID: no-winner diagnostic
- symlink read / target error: diagnostic、followしない
- hashing capability unavailable: root未生成。空digestで続行しない

blocking policyはvalidator-system所有のためADR-034以降で決める。
