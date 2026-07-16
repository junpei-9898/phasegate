---
adr_id: "033"
title: "World snapshot canonicalization、version roots、hashing"
status: Proposed
date: 2026-07-16
---

# World snapshot canonicalization、version roots、hashing

<!-- @work-item-id WI-283 -->

## Context

World Modelはclean checkoutのcorpusとdeclarationから同じfacts / obligationsを再導出しなければならない。filesystem列挙順、object insertion order、absolute checkout root、clock、generated reportがrootへ混ざると、論理入力が同じでも異なるsnapshotになる。一方、extractor、ruleset、schema、World-relevant resolved configが変われば解釈が変わるため、その差はrootへ反映しなければならない。

既存実装には三つの重要な先例と差異がある。

- attestation `canonicalStringify`はobject keyを再帰sortし、array orderを保持し、空白なしJSONをUTF-8 SHA-256へ渡す。
- attestation / ci-governance integrityのfile digesterは`readFile` raw bytesをSHA-256へ渡す。
- requirement-test-matrixは`generatedAt`を毎回生成し、pretty JSONとして保存するため、保存bytesのhashはsemantic matrix identityにならない。

また、既存`NodeCryptoContentHasherAdapter`はattestation-local `ContentHasherPort`と`Digest`を使う。ADR-031によりworld-modelはprovider内部型をimportできず、consumer-owned portを持つ必要がある。ADR-032は`pgw:v1` node IDとPathKeyを確定済みである。

## Decision

### 1. Leaf digestとthree derived rootsを分離する

Artifact / Fragment contentはowner-aware normalization後のbytesをSHA-256し、leaf digest `sha256:<hex>`としてnode factへ入れる。root envelopeはfull proseを重複保持せず、stable node IDs、typed facts、leaf digests、edges、diagnosticsをcanonical JSON化する。

三つのderived identityを定義する。

#### corpusRoot

```text
sha256(canonicalJson({
  schemaVersion,
  extractorVersion,
  corpusConfigDigest,
  nodes,
  edges,
  extractionDiagnostics
}))
```

- nodesはNode ID、edgesはtype/from/to/qualifier、diagnosticsはcode/node/path/line/payloadでsortする。
- constraints / claims / aliases / evaluation findings / obligationsを含めない。
- Snapshot IDは`pgw:v1:snapshot:<corpusRoot>`。

#### constraintRoot

```text
sha256(canonicalJson({
  schemaVersion,
  rulesetVersion,
  constraintConfigDigest,
  constraints,
  explicitClaims,
  aliases,
  declarationDiagnostics
}))
```

- declarationsはstable IDでsortする。
- endpointのpinned digestはdeclaration contentなので含める。
- corpus facts、evaluation output、mutable repayment stateを含めない。

#### evaluationId

```text
pgw:v1:evaluation:sha256(
  canonicalJson({
    schemaVersion,
    rulesetVersion,
    corpusRoot,
    constraintRoot,
    evaluationConfigDigest,
    policyInputsDigest
  })
)
```

外部表現は`pgw:v1:evaluation:sha256:<64 lowercase hex>`。findings、obligations、blocking decision、exit code、reportを含めない。`policyInputsDigest`はADR-035で定義するbaseline / waiver等のimmutable evaluation inputで、未導入時はcanonical empty policy objectのdigestとする。

### 2. Canonical JSON contractを固定する

- object keyは全階層でECMAScript string ascending orderにsortする。
- serializerはarray orderを保持する。
- World-owned set-valued arraysはserializer前にstable ID / canonical tupleでsortする。
- owner-defined ordered arraysはowner orderを保持する。
- whitespace、indent、BOM、trailing newlineなし。
- string escapingとfinite JSON number renderingは`JSON.stringify` semantics。
- `undefined`, sparse array, function, symbol, bigint, `NaN`, Infinityを拒否し、silent omissionしない。
- canonical JSON bytesはUTF-8。

attestationの既存基本規則と一致させるが、serializerのownershipはworld-modelに置き、attestation domain implementationをimportしない。

### 3. Text / bytes normalizationをartifact modeごとに決める

#### UTF-8 text / raw prose

- strict UTF-8 decode。invalid sequenceをreplacement characterへ変換しない。
- CRLFとlone CRをLFへnormalizeする。
- Unicode normalization（NFC / NFD / NFKC / NFKD）は行わない。
- BOM、trailing whitespace、final newline、zero-width characterを含む他code pointは保持する。
- normalized stringをUTF-8 encodeしてhashする。

したがってline endingだけの差はrootを変えないが、Unicode code point sequence、BOM、whitespace、final newlineの差はrootを変える。

#### Structured JSON

- strict UTF-8 decode / parse。
- ownerのversioned schema projectionでsemantic fieldsを選ぶ。
- object key / string valueへUnicode normalizationを適用しない。
- object keyをrecursive sortし、semantic set arraysをowner IDでsortする。
- unknown / unsupported fieldはgeneric name dropせずdiagnostic。

#### Binary

- extractorがbinaryと明示したartifactだけraw bytesをそのままhashする。
- extension heuristicだけでtext / binaryを決めない。

### 4. Matrix / attestation等generated artifactをowner-aware projectionする

genericに`generatedAt`という名前のkeyを全削除しない。各owner adapterがversioned projectionを持つ。

- matrix: `generatedAt`を除外。schema version、Story / AC / TestReference semanticsを含め、Story / AC / refsをowner IDsでsortする。
- attestation: evidence semanticsとverification statusをpublic DTOから観測し、`producedAt`, `gitCommit`, producer package version、signature bytes、attestation self-digest、future `worldSnapshotRoot` self-referenceを除外する。
- World snapshot / obligation report: extractor input corpusから除外し、self-referenceを作らない。
- integrity manifest: owner declarationとしてpath / digest semanticsを観測するが、integrityのraw-byte digest contract自体は変更しない。

### 5. Path、symlink、case semanticsを固定する

- project-relative POSIX PathKeyだけをrootへ入れる。
- `./` / duplicate separatorをnormalizeし、absolute path、drive letter、backslash、`..`を拒否する。
- cwd、realpath、temp root、absolute checkout rootを入れない。
- PathKeyのcaseとUnicode sequenceを保持し、case-sensitiveに比較する。
- symlinkをfollowしない。link entryとtarget stringをfactとして観測し、target file contentを重複hashしない。
- broken / cyclic / outside-root symlinkはdiagnosticにし、traversalしない。
- case-fold collisionはportability diagnosticにし、merge / winner選択しない。
- filesystem列挙後はPathKeyでsortする。

これによりADR-032のpath-based identityを変更せず、異なるabsolute checkoutで同じrootを得る。

### 6. Volatile / self / deployment fieldsを明示的に除外する

root preimageから除外する:

- `generatedAt`, `producedAt`, duration等clock metadata
- absolute path、cwd、realpath、temp path
- mtime、inode、PID、host、user
- git commit
- package version、`skills/.harness-version`、`deployedAt`等deployment version stamp
- obligation report、formatter output、persisted repayment state
- 計算中の`corpusRoot`, Snapshot ID, `constraintRoot`, `evaluationId`
- attestation self-digest / signatureとfuture `worldSnapshotRoot`

除外はowner projectionで明示し、field name一致のgeneric filterは使わない。

`schemaVersion`, `extractorVersion`, `rulesetVersion`はsemantic contract versionなので除外しない。

### 7. Versionsとrelevant config digestをroot-localに含める

- corpusRoot: snapshot `schemaVersion`, `extractorVersion`, `corpusConfigDigest`
- constraintRoot: constraint `schemaVersion`, `rulesetVersion`, `constraintConfigDigest`
- evaluationId: evaluation `schemaVersion`, `rulesetVersion`, `evaluationConfigDigest`, `policyInputsDigest`

config digestはfull `phasegate.config.json` raw hashではなく、resolved defaults込みのscope-specific DTOをcanonical JSON化したSHA-256とする。

- corpus scope: corpus root / include-exclude / extractor options
- constraint scope: declaration locations / rule parameters
- evaluation scope: evaluation semanticsを変えるresolved options

output directory / format、UI limit、validator-system blocking / severity、unrelated layer configは除外する。config不在時は明示default projectionをhashする。

### 8. SHA-256 providerはattestation public facadeに置く

hashing capabilityの最終所有先は**attestation public facade**とし、新shared Unitは作らない。

public contract:

```text
Sha256Capability.hashBytes(bytes: Uint8Array): "sha256:<64 lowercase hex>"
```

- attestation `Digest`, `ContentHasherPort`, infrastructure classをpublic contractへ露出しない。
- `hashUtf8` helperが必要なら`TextEncoder`後に`hashBytes`へ委譲する。
- WM-06で既存`NodeCryptoContentHasherAdapter`の`createHash` primitiveをこのpublic capability implementationへ移動または公開する。
- attestationはattestation-local adapter、world-modelはworld-model infrastructure adapterからcapabilityを呼び、それぞれlocal Digest VOへ変換する。
- world-model domainはconsumer-owned `WorldHashingPort`だけに依存する。
- world-modelからattestation内部Port / VO / adapterをdeep importしない。
- World導入のための新しい`node:crypto` SHA-256 call siteを増やさない。

既存`FileSystemSourceDigesterAdapter`、ci-governance integrity、installationのhash実装を全て統合する作業はWM-06の必須scopeに広げない。

### 9. §10の未決事項へ回答する

#### Raw prose fragment hashのUnicode normalization

**適用しない。** CRLF / CRだけをLFへtransport-normalizeし、それ以外のUnicode code point sequenceを保持したUTF-8 bytesをhashする。NFC / NFDを同一視すると、repositoryが保持する実bytes差を機械が意味的に同一と主張するため採用しない。

#### Hashing capabilityの最終所有先

**attestation public facadeを採用する。** 既存`NodeCryptoContentHasherAdapter`を唯一のWorld向けprimitiveとしてpublic plain capability化する。新shared contract / Unitは作らず、world-modelとattestationが各consumer-owned port / local Digestへadaptする。

## Consequences

### Positive

- clean checkout、filesystem order、absolute root、JSON key order、LF / CRLFに依存しないrootを得られる。
- corpus、constraint、evaluationの変更原因をrootで分離できる。
- generated reportやself digestを入力にする循環を防げる。
- schema / extractor / ruleset / relevant config変更を明示的にrootへ反映できる。
- attestation内部domain modelを漏らさず、`node:crypto`実装を増やさずにSHA-256を再利用できる。

### Negative / Trade-off

- owner artifactごとにversioned semantic projectionとarray sort ruleが必要になる。
- Unicode normalizationを行わないため、見た目が同じNFC / NFD textは別digestになる。
- raw integrity digestとWorld normalized text digestは同じfileでも異なる場合がある。
- attestationがgeneric hashing capabilityのdeployment ownerとなる。
- version bump disciplineを誤ると異なるextractor / rulesetが同じversionを名乗るリスクがある。

## Alternatives

- **full file raw bytesを全artifactでhashする** — LF / CRLF、pretty JSON、matrix `generatedAt`でlogical rootが変わるため不採用。
- **全arrayをgeneric sortする** — ordered process / prose semanticsを壊すため不採用。
- **Unicode NFCを適用する** — repository byte差を意味的同一と主張するため不採用。
- **full config raw hashをrootへ入れる** — output / unrelated validator変更でrootが不必要に変わるため不採用。
- **obligation reportをevaluation inputにする** — derived output改竄で判定を変えられるため不採用。
- **attestation内部`ContentHasherPort` / `Digest`をworld-modelからimportする** — ADR-031のownership / anti-corruption境界に反するため不採用。
- **minimal shared hashing Unitを新設する** —primitive一つに新ownershipとproduct lifecycleを追加するコストが現状のpublic facadeより大きいため不採用。
- **world-model内に新しい`node:crypto` adapterを作る** — SHA-256実装を増やすため不採用。

## 関連要件・文書

- `docs/inception/_cross/WI-280/delivery_plan.md` §1, §3 WM-03, §7 ADR-033, §8, §10
- `docs/inception/_cross/WI-281/logical_design.md`
- `docs/inception/_cross/WI-282/domain_model.md`
- `docs/inception/_cross/WI-283/description.md`
- `docs/inception/_cross/WI-283/domain_model.md`
- `docs/inception/_cross/WI-283/logical_design.md`
- `docs/inception/_cross/WI-283/unit_test_design.md`
- ADR-027（成果物駆動の状態導出）
- ADR-030（attestation canonical payload / integrity）
- ADR-031（ownership / artifact kind / import direction）
- ADR-032（World node identity / PathKey / Snapshot ID）
