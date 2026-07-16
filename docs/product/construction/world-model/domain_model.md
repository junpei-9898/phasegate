---
traceability:
  initial_creation: true
---

# Domain Model: world-model

<!-- @work-item-id WI-285 -->

> **Unit ID**: world-model  
> **作成日**: 2026-07-16  
> **対応ストーリー**: H17-02, H17-04, H17-05, H17-06, H17-07, H17-09  
> **決定根拠**: ADR-031〜035

---

## 1. Domain boundary

world-modelはowner Unitのplain projectionからWorld-local factを組み立て、canonical Snapshotと明示的な構造制約の評価を返す。事実のownerではなくfederated read modelであり、Story / WorkItem / TestReference / evidence / integrityのdomain modelを複製しない。

domain層はfilesystem、Markdown parser、clock、Git、`node:crypto`、他Unit型を知らない。入力はWorld-local value、出力はimmutable domain valueとし、I/Oとanti-corruption変換は外側の層が担う。

## 2. Model classification

### 2.1 Entity / Aggregate

| Model | 分類 | Identity / boundary | 責務 |
|---|---|---|---|
| `WorldNode` | Entity | `WorldNodeId` | Artifact / Fragment / WorkItem / SourceFile / TestReference / ExplicitClaim等のWorld-local factを保持 |
| `Artifact` | Entity projection | artifact node ID | artifactKind、corpusRole、PathKey、content digest、owner provenanceを保持 |
| `Fragment` | Entity projection | fragment node ID | parent artifact、declared / legacy locator、content range digestを保持 |
| `ConstraintRecord` | Entity | constraint node ID | typed directed fact、両endpointのNodePin、宣言provenanceを保持 |
| `Snapshot` | Aggregate / immutable derived output | snapshot node ID | node、edge、diagnosticと三rootの導出境界。保存stateではない |
| `ObligationReport` | immutable derived output | `evaluationId` | current evaluation、baseline、waiver、debtから毎回導出。集約stateとして更新しない |

`Artifact` / `Fragment`は別identityを持つWorldNode specializationであり、同じcontent digestでも統合しない。`Snapshot`は一実行の決定的projectionで、repositoryに保存された前回Snapshotを更新するaggregateではない。

### 2.2 Value Objects

| Value Object | Canonical form | Invariant |
|---|---|---|
| `WorldNodeId` | `pgw:v1:<node-type>:...` | node typeごとのschemaでparseし、opaque string比較する |
| `PathKey` | project-relative POSIX path | absolute / drive letter / backslash / `..`を拒否。caseとUnicode code pointを保持 |
| `DeclaredKey` | project-global key（推奨`<unit>.<concept>`） | 同一node type / corpus role内で一意 |
| `Sha256Digest` | `sha256:<64 lowercase hex>` | algorithm prefixとhex長・caseを生成時に検証 |
| `ContentDigest` | `Sha256Digest` wrapper | node content projectionのdigest。identityとは別 |
| `CorpusRole` | owner-defined corpus role（designでは`product` / `inception`） | product / inceptionを区別し、artifact kindと混同しない |
| `ArtifactKind` | `design-document | source | generated-artifact | external-declaration` | lifecycle ownershipを表す |
| `FragmentLocator` | declared keyまたはlegacy whole-file | heading text / orderをidentityにしない |
| `WorldEdge` | `{ type, claimantId, premiseId, provenance }` | directionを保持し、endpointを暗黙入替しない |
| `NodePin` | `{ nodeId, observedDigest }` | node IDとcontent digestの組を必須とする |
| `ExtractionDiagnostic` | `{ code, subject, path, line?, payload }` | findingと混ぜず、stable sort可能なpayloadを持つ |
| `ChangeProvenance` | `{ baselineSnapshotId?, currentSnapshotId, changedCandidates }` | 因果を主張せず、比較候補だけを表す |
| `ViolationFingerprint` | rulesetを含むcanonical violation identity | `constraintId`と別。observed digest / cardinality driftで新fingerprint |
| `EvaluationId` | `pgw:v1:evaluation:sha256:<64 lowercase hex>` | corpus / constraint / policy inputsの評価identity。finding / exit codeを含めない |
| `SchemaVersion` | owner-defined literal | unknown valueをfallbackせずadmission errorにする |
| `ExtractorVersion` | extractor contract version | corpus root preimageに含める |
| `RulesetVersion` | WCR semantic version | constraint rootとevaluation IDの双方へ含める |

## 3. Identity schema

`WorldNodeId`はADR-032の`pgw:v1` schemaを正本とし、domain factoryは次のnode typeを区別する。

| Node type | 形式（概念表記） | Identity source |
|---|---|---|
| Artifact | `pgw:v1:artifact:<artifact-kind>:<corpus-role>:<path-key>` | kind + role + canonical path |
| Fragment | `pgw:v1:fragment:<corpus-role>:<declared-key>`、またはlegacy whole-file locator | explicit markerを優先。heading非依存 |
| WorkItem | `pgw:v1:work-item:<owner-id>` | traceability owner DTOのcanonical ID |
| SourceFile | `pgw:v1:source-file:<path-key>` | canonical project-relative path |
| TestReference | `pgw:v1:test-reference:<owner-defined-tuple>` | matrix owner DTOのcanonical tuple |
| ExplicitClaim | `pgw:v1:explicit-claim:<declared-key>` | explicit declaration |
| Constraint | `pgw:v1:constraint:<declared-key>` | reviewed constraint declaration |
| Snapshot | `pgw:v1:snapshot:sha256:<64-lowercase-hex>` | canonical corpus root |

file identityとfragment identityは分離する。explicit fragment markerは`<!-- @world-fragment-id <DeclaredKey> -->`、proposal / canonical relationはinception側の`<!-- @world-reflects product:<DeclaredKey> -->`で宣言する。legacy fileはwhole-file Fragmentを一つ生成し、`@world-fragment-migration complete`宣言後はfallbackを禁止する。

rename / moveは旧path missing + 新path addedとして観測し、continuityはsingle-hop explicit aliasだけで表す。alias chainを推論せず、duplicate ID / alias ambiguityではwinnerを選ばない。

## 4. Fact graph

World factはtyped directed edgeとして保存する。

```mermaid
flowchart LR
    A[Artifact] -->|contains| F[Fragment]
    F -->|declares / references| N[WorldNode]
    P[Proposal Fragment] -->|reflects| C[Canonical Fragment]
    R[ConstraintRecord] -->|claimant pin| CL[Claimant Node]
    R -->|premise pin| PR[Premise Node]
    S[Snapshot] -->|contains| A
    S -->|contains| R
```

directionは宣言の意味を保持する。一方、constraint evaluationはclaimant / premise双方のexistence、identity、digestを対称に検査する。edge directionとendpoint-symmetric validationを同一概念にしない。

## 5. Snapshot and roots

### 5.1 Snapshot

```text
Snapshot {
  schemaVersion,
  extractorVersion,
  nodes: WorldNode[],
  edges: WorldEdge[],
  diagnostics: ExtractionDiagnostic[],
  corpusRoot,
  constraintRoot?,
  evaluationId?
}
```

canonical JSONはobject keyをrecursive sortし、ordered arrayは順序を保持、set-valued collectionはowner-defined stable keyでsortしてからserializeする。`undefined`、sparse array、NaN、Infinity、bigintはcanonicalization errorとする。

textはstrict UTF-8として読み、CRLF / lone CRをLFへ正規化する。Unicode normalization、trailing whitespace除去、final newline補完、BOM除去は行わない。symlinkはfollowせずlink target factとして観測する。case-fold collision、invalid UTF-8、root外pathはdiagnosticとする。

### 5.2 Root preimages

| Root | Input | Exclusion |
|---|---|---|
| `corpusRoot` | owner-projected nodes / edges / diagnostics、schemaVersion、extractorVersion、corpus config digest | generatedAt、absolute root、mtime、Git SHA、output path、root自身、obligation report |
| `constraintRoot` | constraint / claim / alias declaration projection、pins、rulesetVersion、constraint config digest | formatting、array enumeration order、root自身 |
| `evaluationId` | corpusRoot、constraintRoot、rulesetVersion、schemaVersion、evaluation config digest、policyInputsDigest、`policyAsOfDate` | findings / obligation order、report formatting、generatedAt、ID自身 |

`rulesetVersion`をconstraintRootとevaluationIdの双方に含め、false stabilityより再評価を選ぶ。config digestはcorpus / constraint / evaluation scopeへ分ける。

## 6. Constraint model

```text
ConstraintRecord {
  constraintId: WorldNodeId,
  relationType,
  claimant: NodePin,
  premise: NodePin,
  applicableRuleIds: sorted non-empty WCR ID set,
  declarationProvenance,
  schemaVersion
}
```

機械評価はexistence、ID uniqueness、explicit reference、declared dependency、digest equalityに限定する。`refines`は明示ID宣言だけをfact化し、prose similarityやheadingから意味関係を推論しない。

### WCR ruleset

| Rule ID | Domain meaning |
|---|---|
| WCR-001 | malformed / inadmissible declarationを評価前に隔離する |
| WCR-002 | endpointがcurrent Snapshotに存在しない |
| WCR-003 | baselineにはexact endpointが存在しcurrentではmissing（valid aliasなし） |
| WCR-004 | explicit rename continuity / alias宣言が無効 |
| WCR-005 | canonical node IDが複数candidateへ解決し一意でない |
| WCR-006 | explicit reference / `refines` targetまたはrelationが解決しない |
| WCR-007 | explicit `depends-on` endpointまたはdependency relationが解決しない |
| WCR-008 | endpoint対pin、またはexplicit content-equals endpoint間のdigest不一致 |

initial evaluationにbaseline Snapshotがないmissing endpointはWCR-002であり、deletionとは呼ばない。aliasなしrenameはremoved + addedで、WCR-004にしない。

## 7. Obligation and policy projection

domain evaluationはpolicy-free `ConstraintEvaluation`を返す。application層がversioned external declarationsをadmitし、次のderived projectionを組み立てる。

| Input / output | Semantics |
|---|---|
| Adoption baseline | 同一ruleset内のclosed fingerprint set。新規追加禁止、返済済みentryの削除のみ |
| Waiver | exact fingerprint、理由、期限、WI traceabilityを持つreview済み例外 |
| Explicit semantic debt | explicit debt IDを持つ人の宣言。structural obligationとは別種 |
| Obligation report | immutable derived output。`repaid`をcurrent evaluationから計算し保存しない |

constraint IDは宣言のidentity、violation fingerprintは観測されたviolationのidentityである。rulesetVersion変更時は旧baselineを暗黙移行せず、同一rulesetのfingerprint再測定とreviewを要求する。WCR-001とmalformed policy inputはwaiveできない。

## 8. Domain services

| Service | Input | Output / responsibility |
|---|---|---|
| `WorldNodeIdentityFactory` | owner DTO identity / PathKey / locator | typed `WorldNodeId`またはidentity diagnostic |
| `TextContentNormalizer` | raw bytes | strict UTF-8 + LF canonical contentまたはdiagnostic |
| `CanonicalJsonSerializer` | supported domain projection | deterministic UTF-8 canonical bytes |
| `SnapshotBuilder` | extracted nodes / edges / diagnostics、versions、config digest | immutable Snapshot preimage |
| `SnapshotRootDeriver` | canonical bytes + `WorldHashingPort` | corpusRoot / constraintRoot / evaluationId |
| `ConstraintEvaluator` | Snapshot + admitted ConstraintRecord[] | policy-free WCR findings |
| `ChangeProvenanceBuilder` | baseline? + current Snapshot | changed candidates（因果主張なし） |
| `ViolationFingerprintDeriver` | canonical violation projection | ruleset-bound fingerprint |
| `ObligationDerivationService` | evaluation + admitted policy inputs + as-of date | immutable obligation report |

## 9. Domain invariants

1. Snapshot構成要素はimmutableで、同一semantic inputからbyte-identical rootを返す。
2. hashing providerは`Uint8Array -> Sha256Digest`のconsumer-owned portだけであり、domainがprovider型を参照しない。
3. hard extraction diagnosticがある場合、trustworthy Snapshot / evaluationを成功扱いしない。
4. duplicate node / declaration / aliasにwinnerを設けない。
5. generated artifactのvolatile field除外はowner-defined projectionでのみ行い、unknown fieldを汎用的にdropしない。
6. attestation projectionはraw signatureを除外しverification statusを含める。
7. obligation report、waiver残日数表示、absolute pathをroot / fingerprintへ混ぜない。
8. semantic debt declaration/importとstructural obligationを別categoryとして表示し、後者をsemantic debtの「再発見」と表現しない。

## 10. Implementation status

本書はWM-06〜17で実装予定のdomain contractである。WM-05時点では`scripts/harness/world-model/`実装やWCR validator登録の完了を主張しない。
