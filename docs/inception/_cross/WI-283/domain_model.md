# WI-283 Domain Model: World snapshot canonicalization と version roots

<!-- @work-item-id WI-283 -->

## 1. Ubiquitous Language

| 用語 | 定義 |
|---|---|
| Canonical value | JSON data modelへ射影済みで、object keyとcollection orderが決定済みの値 |
| Canonical bytes | canonical valueを空白なしJSONへ直列化したUTF-8 bytes |
| Leaf digest | Artifact / Fragmentのowner-aware normalized content bytesに対するSHA-256 |
| Corpus root | 抽出済みcorpus factsとextraction diagnosticsをversioned envelopeとしてhashしたroot |
| Constraint root | constraint / explicit claim / alias declarationsとparse diagnosticsをversioned envelopeとしてhashしたroot |
| Evaluation ID | corpus rootとconstraint rootを特定のruleset / evaluation configで評価する入力identity |
| Relevant config | Worldの抽出・constraint解釈・評価結果を変えるresolved configの最小projection |
| Volatile field | clock、host、absolute locationなど、論理入力を変えず実行ごとに変わるfield |

## 2. Value Objects

### Sha256Digest

- external form: `sha256:<64 lowercase hex>`
- algorithmは`sha256`固定
- equalityは文字列完全一致
- attestationの`Digest`とは別のworld-model local VO

### CanonicalJsonValue

許可する型:

- `null`
- boolean
- finite JSON number
- string
- dense array
- string keyのobject

`undefined`, sparse array, function, symbol, bigint, `NaN`, `Infinity`, `-Infinity`はcanonicalization error。object内のundefinedをsilent omissionしない。

### CanonicalBytes

- recursive object key sort
- no insignificant whitespace
- no trailing newline / BOM
- JSON string / finite number renderingはECMAScript `JSON.stringify` semantics
- UTF-8 encode

arrayはserializerが並べ替えず、domain projectionが意味に応じて事前にorderを決める。

### ContentNormalizationMode

| mode | input | normalization |
|---|---|---|
| `utf8-text` | Markdown / source / text declaration | strict UTF-8 decode、CRLFとlone CRをLFへ変換、他code point・BOM・trailing whitespace・final newlineを保持 |
| `structured-json` | matrix / integrity / World declaration等 | strict UTF-8 decode、parse、owner schema projection、canonical JSON |
| `raw-bytes` | extractorがbinaryと宣言したartifact | bytesを変更せずhash |
| `symlink-target` | symlink entry | link target文字列をUTF-8 bytesとしてhashし、target fileは読まない |

text contentへNFC / NFD / NFKC / NFKDを適用しない。Unicode canonically equivalentな別byte sequenceは別contentとして扱う。

### VersionSet

- `schemaVersion`
- `extractorVersion`
- `rulesetVersion`

各値はhuman-readable immutable string。package version / git SHA / `.harness-version`とは別で、contractが変わるときだけ明示bumpする。

### RelevantConfigDigest

- `scope: corpus | constraint | evaluation`
- `digest: Sha256Digest`
- resolved configのscope-specific canonical projectionから導出
- config不在時も明示default projectionをhashし、missingをempty stringで表さない

## 3. Root Value Objects

### CorpusRoot

external form: `sha256:<64 lowercase hex>`

preimage:

```text
CorpusRootInput {
  schemaVersion
  extractorVersion
  corpusConfigDigest
  nodes[]
  edges[]
  extractionDiagnostics[]
}
```

canonical order:

- nodes: `WorldNodeId`
- edges: `(edgeType, fromId, toId, canonicalQualifier)`
- diagnostics: `(code, nodeId-or-empty, pathKey-or-empty, line-or-0, canonicalPayload)`
- node内のset-valued reference / tag / alias配列: canonical ID / scalar
- proseやowner-defined ordered data: owner orderを保持

nodesはfull contentを埋め込まず、identity、typed facts、normalized leaf digestを含む。

exclusions:

- constraints / explicit claims / aliases
- evaluation findings / obligations / obligation report
- `corpusRoot`自身とSnapshot ID
- `generatedAt`等owner-declared volatile field
- absolute project root、cwd、realpath、temp path
- mtime、inode、PID、hostname、user、git commit
- package version、`skills/.harness-version`等deployment stamp

Snapshot IDはADR-032どおり`pgw:v1:snapshot:<corpusRoot>`。

### ConstraintRoot

external form: `sha256:<64 lowercase hex>`

preimage:

```text
ConstraintRootInput {
  schemaVersion
  rulesetVersion
  constraintConfigDigest
  constraints[]
  explicitClaims[]
  aliases[]
  declarationDiagnostics[]
}
```

canonical order:

- constraints: ConstraintId
- explicitClaims: ExplicitClaimId
- aliases: aliasId
- diagnostics: corpus diagnosticsと同じtuple rule

constraint endpointのpinned node ID / content digestはdeclaration contentなので含む。baseline / waiverの最終分類はADR-035で決めるが、constraint semanticsを変更しないevaluation policy inputはConstraintRootへ混ぜない。

exclusions:

- corpus facts / content
- evaluation result / obligations
- `constraintRoot`自身
- waiver適用後state / mutable repayment state
- report / clock / absolute path / deployment stamp

### EvaluationId

external form: `pgw:v1:evaluation:sha256:<64 lowercase hex>`

preimage:

```text
EvaluationInput {
  schemaVersion
  rulesetVersion
  corpusRoot
  constraintRoot
  evaluationConfigDigest
  policyInputsDigest
}
```

`policyInputsDigest`はADR-035で確定するbaseline / waiver等のimmutable evaluation input projection。未導入時はcanonical empty policy objectのdigestを使う。

exclusions:

- findings / obligation array / obligation report
- blocking decision / severity override / exit code
- `evaluationId`自身
- generatedAt / duration / output path

同じEvaluationInputは同じfindingsを導出すべきであり、reportを手編集してもEvaluationIdは変化しない。

## 4. Entities

### CanonicalWorldSnapshot

- `snapshotId`
- `corpusRoot`
- `versionSet`
- `corpusConfigDigest`
- sorted nodes / edges / diagnostics
- display metadata (`generatedAt`等)は別envelopeに置き、root preimageへ入れない

### CanonicalConstraintSet

- `constraintRoot`
- `schemaVersion`
- `rulesetVersion`
- `constraintConfigDigest`
- sorted declarations / diagnostics

### EvaluationDescriptor

- `evaluationId`
- `corpusRoot`
- `constraintRoot`
- `rulesetVersion`
- relevant config / policy input digests
- findingsはdescriptorから導出するoutputでありentity stateに保存しない

## 5. Domain Services

### CanonicalJsonSerializer

`serialize(value: CanonicalJsonValue): CanonicalBytes`

- object keysを再帰的にascending sort
- array orderを保持
- invalid valueをfail-closed
- current attestation `canonicalStringify`と同じ基本規則をWorld-local contractとして実装する

### TextContentNormalizer

`normalize(bytes): CanonicalBytes`

- fatal UTF-8 decode
- `\r\n` / `\r` → `\n`
- Unicode normalizationなし
- final newline / BOM / whitespace保持

### RootDerivationService

- `deriveCorpusRoot(input)`
- `deriveConstraintRoot(input)`
- `deriveEvaluationId(input)`
- self fieldをpreimageに含めない
- canonical bytesをconsumer-owned `WorldHashingPort`へ渡す

## 6. Ports

### WorldHashingPort

world-model consumer-owned domain port:

```text
sha256(bytes: Uint8Array): Sha256Digest
```

attestation public capabilityから返るplain lowercase hex / prefixed stringをworld-model infrastructure adapterがlocal `Sha256Digest`へ変換する。world-model domainはattestation `Digest`, `ContentHasherPort`, `NodeCryptoContentHasherAdapter`をimportしない。

### ArtifactByteSourcePort

- project-relative lexical pathだけを受ける
- regular file bytes / symlink targetを判別して返す
- absolute pathをdomain DTOへ出さない
- traversal時symlinkをfollowしない

## 7. Invariants

| ID | invariant |
|---|---|
| CAN-1 | 同じlogical inputはbyte-identical canonical bytesを返す |
| CAN-2 | object key order / filesystem enumeration orderはrootへ影響しない |
| CAN-3 | ordered arrayはorderを保持し、set-valued arrayだけをdomain projectionでsortする |
| CAN-4 | UTF-8 textのLF / CRLF差はrootへ影響しない |
| CAN-5 | Unicode normalizationは行わず、code point sequence差を保持する |
| CAN-6 | symlinkをfollowせず、case-fold collisionをmergeしない |
| ROOT-1 | corpus / constraint / evaluation outputは互いのderived reportをinputにしない |
| ROOT-2 | semantic contract versionとrelevant config digestをpreimageへ含める |
| ROOT-3 | clock / absolute root / deployment version / self digestをpreimageから除外する |
| HASH-1 | world-modelはconsumer-owned portを持ちattestation内部型へ依存しない |
| HASH-2 | World導入のための`node:crypto` SHA-256呼び出し実装を増やさない |
