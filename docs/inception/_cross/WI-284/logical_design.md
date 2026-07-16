# WI-284 Logical Design: World constraint、baseline、waiver、CLI

<!-- @work-item-id WI-284 -->

## 1. 設計目的

Worldの構造事実から決定的なevaluationを作り、その結果をimmutable obligationとして表示しつつ、既存違反のadoptionと期限付き例外をgate policyから分離する。constraintの意味、policy input、既存L4-004、CLI / persistenceを別責務として設計し、ADR-034〜037を次の順で確定する。

```text
ADR-034  constraint fact / pin / structural rule / evaluation
    ↓
ADR-035  obligation / fingerprint / adoption baseline / waiver
    ↓
ADR-036  L4-004 doc freshnessとのrule ownership / coexistence
    ↓
ADR-037  CLI / config / file / output / validator registration
```

## 2. 現行実装の調査結果

| surface | 実装根拠 | 現行挙動 | World設計での扱い |
|---|---|---|---|
| phase dependency graph | `phase-dependency-model/domain/services/gate-graph.ts` | gateから`dependsOn`へ有向辺を作り、duplicate / unknown dependency / level order / cycleを検証 | 明示された有向依存と構造検証の先例。World graphへmodelをimportしない |
| phase artifact path | `phase-dependency-model/domain/values/artifact.ts` | placeholderを解決しPOSIX pathへnormalize | ADR-032 PathKeyを優先し、現行Artifact VOをWorld identityへ再利用しない |
| L4-001 drift | `validator-system/domain/services/l4/drift-detection-service.ts` | design / codeの`(unitName, element)`集合と明示pointerを比較し、`design→code` / `code→design` reportを作る | 現行drift capabilityとして維持。stable World node / pin / baselineを持つconstraint evaluatorとは分離 |
| semantic drift | `validator-system/domain/services/l4/semantic-drift-service.ts` | design / code / testを`(unitName, behaviorId)`で比較する | 明示behavior IDによる集合検査の先例。prose similarityや因果推論の根拠にはしない |
| validator identity | `validator-system/domain/value-objects/validator-id.ts` | registryで許可された`Lx-NNN`だけをValidatorIdとして受理 | World内部rule IDには使わない。World validatorのlayer IDはADR-037で登録契約と同時に決定 |
| validator rule | `validator-system/domain/value-objects/validator-definition.ts`, `validation-rule.ts` | validator definitionが複数ruleとerror codeを保持する | `WCR-NNN`をWorld evaluation DTOから渡せるようにし、blocking / severityはvalidator-systemに残す |
| existing baseline | `ci-governance/domain/value-objects/baseline-snapshot.ts`, `baseline-entry.ts` | path集合とSHA-1 entryを持つci-governance-owned baseline | World adoption baselineとして再利用しない。ADR-035でfingerprint-based external declarationを別定義する |

## 3. 全体データフロー

```text
provider DTO / repository corpus
  -> World extractors
  -> canonical World Snapshot (corpusRoot)

external constraint declarations
  -> declaration parser / diagnostics
  -> ConstraintRecord + explicit facts + aliases (constraintRoot)

Snapshot + constraints + immutable policy inputs
  -> endpoint resolution
  -> structural rule evaluation
  -> Evaluation DTO (evaluationId)
  -> immutable obligation derivation
  -> adoption / waiver classification
  -> validator-system policy adapter
  -> human / JSON CLI presentation
```

- world-modelはfacts、constraints、evaluation、obligation derivationを所有する。
- validator-systemはlayer execution、severity、blocking、exit codeを所有する。
- harness-api / top-level compositionはcommand dispatchとstdout / stderr接続を所有する。
- external declarationとgenerated reportを同一artifactとして扱わない。

## 4. ADR-034: Constraint semantics

### 4.1 DirectedFact

明示relationは意味方向を保持する。

```text
claimant --references / depends-on / refines / content-equals--> premise
```

`claimant`は宣言を行い、その整合を主張する側、`premise`は主張が参照する前提側である。`content-equals`のpredicate自体が対称でも、record orderは宣言provenanceのため維持する。reverse factは生成しない。

### 4.2 ConstraintRecord

```text
ConstraintRecord
  constraintId: pgw:v1:constraint:<DeclaredKey>
  schemaVersion
  factType
  claimant: NodePin { nodeId, contentDigest }
  premise:  NodePin { nodeId, contentDigest }
  applicableRuleIds: sorted WCR IDs
  declarationArtifactId
  declarationLocator
```

- 両`NodePin`は必須で、digestは`sha256:<64 lowercase hex>`。
- pinは作成時snapshotのendpoint ID / digestを保持し、評価時に書き換えない。
- alias解決後のID / locatorはevaluation evidenceであり、declaration recordをmutationしない。
- canonicalized recordとdeclaration diagnosticsはADR-033の`constraintRoot`へ入る。
- last evaluated time、status、repayment state、blocking stateはrecordへ入れない。

### 4.3 Endpoint-symmetric evaluation

有向factの意味を保ったまま、claimantとpremiseのどちらが変化しても同じconstraintを再評価する。

1. current snapshotで両endpointをexact ID解決する。
2. exact IDがなければADR-032のsingle-hop explicit aliasだけを試す。
3. duplicate解決はwinnerを選ばずuniqueness violationにする。
4. 両endpointのcurrent digestを各pinと比較する。
5. fact typeに対応する明示reference / dependency / equalityを評価する。

changed candidateによるincremental schedulingを実装しても、全constraint再評価と同一結果にならなければならない。

### 4.4 Rule namespace

`WCR-NNN`はWorld constraint ruleset内のstable rule IDとする。ADR-032のlowercase extraction diagnostic、validator-systemの`Lx-NNN`、将来ADR-037で決めるvalidator IDとは別namespaceである。

| rule ID | category | condition |
|---|---|---|
| `WCR-001` | declaration admission | required field、ID、digest、rule / fact typeがmalformedまたはunsupported |
| `WCR-002` | existence | current snapshotにendpointがなく、baselineにも同一IDの存在証拠がない |
| `WCR-003` | existence / deletion | baselineにはexact endpointが存在し、current snapshotではmissing、かつ有効なexplicit aliasがない |
| `WCR-004` | existence / explicit reference | old IDからnew IDへのexplicit aliasでrename continuityを宣言したが、single-hop / target / role / uniqueness条件を満たさない |
| `WCR-005` | ID uniqueness | canonical node IDが複数locatorへ解決し、endpointを一意に選べない |
| `WCR-006` | explicit reference | 宣言されたreference / `refines` targetが解決しない、または明示relationと一致しない |
| `WCR-007` | declared dependency | 明示`depends-on` endpointまたは依存relationが解決しない |
| `WCR-008` | digest equality | claimantまたはpremiseのcurrent digestがrecorded pinと一致しない、または明示`content-equals`の両current digestが一致しない |

`WCR-001`はdeclarationをevaluationへadmitするための構文・型検査である。`WCR-002`〜`WCR-004`はexistence / explicit resolution familyであり、新しい意味推論categoryを追加しない。

### 4.5 Finding selection

同じendpointについて結果を重複させないため、resolutionは次のprecedenceを持つ。

1. malformed declaration: `WCR-001`
2. duplicate exact / alias target: `WCR-005`
3. exact current endpoint: resolved
4. explicit aliasあり: `WCR-004`を評価し、validなら`resolved-via-alias` evidence
5. baselineにexact endpointあり: `WCR-003`
6. それ以外のmissing: `WCR-002`

endpoint解決後だけ`WCR-006`〜`WCR-008`を評価する。unresolved endpointへdigest mismatchを重ねない。

### 4.6 Explicit-only `refines`

`refines`は宣言にclaimant / premiseのstable World node IDが明示され、両方が一意に解決した場合だけ有向factへする。

- same DeclaredKey、heading text / order、path、WorkItem、content digest、prose similarityから生成しない。
- `@world-reflects`の`reflected-as` relationを自動的に`refines`へ格上げしない。
- target不在は`WCR-006`、構文 / node type不正は`WCR-001`。
- 意味的に「より詳細」「置換済み」であるかは機械判定しない。

### 4.7 ChangeProvenance

```text
ChangeProvenance
  baselineSnapshotId: pgw:v1:snapshot:... | null
  baselineCorpusRoot: sha256:... | null
  currentSnapshotId: pgw:v1:snapshot:...
  currentCorpusRoot: sha256:...
  changedCandidates[]:
    nodeId
    changeKind: added | removed | modified | candidate-cardinality-changed
    baselineDigest?
    currentDigest?
    baselineLocators[]
    currentLocators[]
```

candidateはNode ID、change kind、locatorのcanonical tupleでsortする。これは「この差が再評価候補になった」というevidenceであり、ある編集が別endpointの変化を引き起こしたとは主張しない。

- initial runはbaselineを`null`にできる。
- path-based renameはold removed + new added。
- explicit aliasがvalidな場合だけrename continuityを表示する。
- digest一致、類似名、近接時刻からrename / causeを推論しない。

## 5. ADR-035: Obligation、baseline、waiver

ADR-034のevaluation findingはpolicy非依存のまま保持し、ADR-035のderivation stageがexternal policy declarationsとjoinする。

```text
WCR finding
  -> violationFingerprint
  -> adoption baseline membership
  -> exact active waiver lookup
  -> structural obligation classification

baseline fingerprints - current fingerprints
  -> repaidBaselineEntries

explicit semantic debt declarations
  -> declaredSemanticDebts（別collection）
```

`violationFingerprint`はrulesetVersion、ruleId、constraintId、factType、両endpoint pin、rule-owned expected / observed evidenceから作る。`evaluationId`、policy、severity、message、locator、ChangeProvenanceは含めない。`constraintId`はdeclaration identity、fingerprintはobserved violation identityである。

adoption baselineは採用時evaluationの既存fingerprintだけを持つclosed setとし、同一rulesetでは追加禁止・返済削除のみとする。current集合から消えたentryは`repaid`として導出し、baseline cleanup requiredにする。stale entryを保持して再発を再免除しない。

waiverはexact fingerprint、reason、exclusive UTC `expiresOn`、WorkItem、stable waiver IDを必須とする。renewalはnew waiver ID / WIと`renewalOf`で明示し、自動延長しない。WCR-001とmalformed policy inputはnon-waivableである。

`policyInputsDigest`はcanonical baseline、sorted waivers、sorted semantic debtsと、waiver declarationがある場合のresolved UTC policy dateを含む。policy変更は`evaluationId`を変えるが、raw WCR finding / fingerprintは変えない。

semantic debt IDは`pgw:v1:semantic-debt:<DeclaredKey>`。coverage reportはfile-level `<!-- @world-semantic-debt <id> -->`でexternal declarationを参照する。これは既存`@coverage-gating: ungated-legacy`を置換せず、structural obligation、baseline、waiver、attestationとして扱わない。

ci-governanceの既存path / SHA-1 baselineはhook grandfather専用であり、この入力へimport / upgrade /暗黙変換しない。

## 6. ADR-036: L4-004 coexistence

World rulesはstable ID、explicit relation、digest pinを評価する。L4-004はdocument自身のlatest Git timestamp、fallback mtimeとwarn / error day thresholdからtime-since-review riskを評価する。current production L4-004はsource hash、explicit reference / dependencyを読まず、`related-source-change`を生成するadapterも持たない。

canonical owner:

| predicate | rule owner | gate owner |
|---|---|---|
| document age threshold | phase2-extensions `FreshnessCheckService` / L4-004 | validator-system |
| explicit endpoint / reference / dependency / digest | world-model WCR | validator-system |

同一documentに両findingがある場合、WCR obligationをexplicit structural remediationのprimary、L4-004をsupporting temporal signalとする。raw findingsは両方保持し、path / messageだけでdeduplicateしない。L4 findingをWorld fingerprint / baseline / waiverへ入れず、World classificationでL4を抑止しない。

L4-004は現役product capabilityとして維持する。WM-20のauthoritative World re-derivation後、WM-24完了・一warn-threshold期間・2回以上のdual-runを満たすcompatibility periodを設ける。document class別のoverlap / L4-only / WCR-only inventory後にだけpattern単位の縮退を検討する。

- time-only policy、unconstrained docs、actionable L4-only finding、consumer compatibilityがあれば維持。
- World coverage complete、unique L4 valueなし、time policy不要、migration guideありの場合だけ別WIで縮退。
- 将来L4へexplicit hash / reference sub-ruleが入った場合だけ、そのsub-ruleをWorldへ移行。
- current git-age / mtime predicateとL4-004 ID全体は本ADRで廃止しない。

self-repoのL4 disabledはdogfood policyでありcapability廃止ではない。aggregate pathではskipを維持し、明示`validate --layer L4`はforce-enableできる。strict presetのenabled、minimal / standardのdisabledも変更しない。

## 7. ADR-037: CLI、config、persistence

canonical command:

| command | default side effect | explicit mutation | exit 1 |
|---|---|---|---|
| `world:inspect` | none | なし | snapshotは生成したがhard extraction diagnosticあり |
| `world:pin` | preview-only | `--apply`でconstraintsをatomic update | missing / duplicate / ambiguous endpoint |
| `world:derive` | pure/read-only | `--write [--out <path>]`でreportをatomic write | blocking obligation / policy cleanupあり |

全commandは`--format human|json`と`--json` aliasを持つ。stdoutはprimary resultだけ、JSON modeは`phasegate-world-cli/v1` envelope一件だけを出す。stderrはusage / unsupported schema / unexpected process failureへ限定する。exit 0=success / non-blocking、1=domain / gate finding、2=trustworthy resultを作れないusage / config / schema / I/O / hashing failure。

control / generated file:

| lifecycle | canonical path |
|---|---|
| Git-tracked constraints | `phasegate.world-constraints.json` |
| Git-tracked adoption baseline | `phasegate.world-baseline.json` |
| Git-tracked waivers | `phasegate.world-waivers.json` |
| Git-tracked semantic debts | `phasegate.world-debts.json` |
| ignored generated obligation report | `.harness/world-obligations.json` |

declaration absentはcanonical empty input、存在するunknown schemaはexit 2でfail-closed。schema contractsは`docs/contracts/world-*.schema.json`へ実装WIで置く。reportは判定入力にせず、pure / write modeでdomain resultを変えない。

top-level config keyは`world`。automatic integrationはdefault disabledだが、explicit `world:*`は実行できる。config不在時は`docs/product`, `docs/inception`, `docs/ADR`, `scripts/harness`と既存matrix / attestation / integrity default pathを使う。config存在時はconfig-foundation resolved DTOだけを使い、invalid / unknown configをdefaultsへfallbackしない。

Phase C validator IDは`L2-017 world-constraint-admission`、`L3-008 world-constraint-rederivation`を予約する。`WCR-NNN`とは別identityであり、registry実装はWM-19 / WM-20まで行わない。

WM-21 session-start World sectionはdefault 5 entries / 2000 Unicode scalar values、schema maximum 20 / 8000。blocking-firstでstable sortし、entry境界で省略する。free text / report全文をinjectせず、persisted reportだけを正本として読まない。current World query / in-process deriveを使い、hookはwarn-only / exit 0を維持する。

attestation v2 `schemaVersion` / `predicateType` / v1 coexistenceはattestation ownerのWM-23へ委譲し、本設計で先取りしない。

## 8. Failure / ownership contract

| failure | World result | gate ownership |
|---|---|---|
| malformed declaration | `WCR-001` finding / declaration diagnostic | validator-systemがblocking policyを決定 |
| duplicate endpoint | no winner + `WCR-005` | validator-system |
| missing / deleted endpoint | `WCR-002` / `WCR-003` | validator-system |
| invalid explicit rename alias | `WCR-004` | validator-system |
| broken reference / dependency | `WCR-006` / `WCR-007` | validator-system |
| digest drift | `WCR-008` | validator-system |
| hashing / snapshot unavailable | evaluationを生成しないfail-closed diagnostic | validator-system adapterがempty successへ変換しない |
| ruleset-mismatched / malformed policy input | policy classificationを生成しないfail-closed diagnostic | validator-systemがblocking |
| repaid baseline entry残置 | `repaidBaselineEntries` | validator-systemがcleanup requiredとしてblocking |
| expired waiver | waiverを適用せずpolicy diagnostic | 元structural classificationで判定 |

World evaluation DTOはrule ID、constraint ID、endpoint evidence、change provenanceを返す。severity、blocking、exit codeを含めない。

## 9. Test designへの入力

実装WIでは最低限次のmutation pairを用意する。

- claimantだけのdigest変更 / premiseだけのdigest変更が同じconstraintを再評価する。
- missing new endpointとbaselineから削除されたendpointが別rule IDになる。
- path renameをaliasなしではremoved + added、valid aliasありでは`resolved-via-alias`とする。
- duplicate exact ID / duplicate alias targetでwinnerを選ばない。
- explicit `refines`は受理し、same heading / digestだけではfactを生成しない。
- malformed declarationから部分的ConstraintRecordを生成しない。
- incremental candidate evaluationとfull evaluationのserialized resultが一致する。
- locator / messageだけの変更ではfingerprint不変、observed digest / ruleset変更ではfingerprintが変わる。
- `B ∩ V`, `B − V`, `V − B`がadopted / repaid / newへ決定的に分類される。
- same-ruleset baselineへのentry追加を拒否し、entry削除だけを受理する。
- ruleset mismatchではold fingerprintを適用せずfail-closedにする。
- waiverはexact fingerprintだけへ適用し、`policyAsOfDate == expiresOn`でexpiredになる。
- waiver renewalはnew ID / WI / `renewalOf`を必要とし、old scopeをtransitiveに継承しない。
- semantic debtはstructural obligation countへ混ぜず、`declared/imported`として別表示する。
- 既存`.phasegate/baseline.json`をWorld policy repositoryが読み込まない。
- git-log age / mtimeだけがthreshold超過した場合、L4-004だけがfindingを返しWCR obligationを作らない。
- fresh documentのexplicit pinだけがdriftした場合、WCRだけがfindingを返しL4-004 passで打ち消されない。
- 同じdocumentに両findingがあってもstructural obligation / fingerprintを一件だけWCR由来で数える。
- World adoption / waiver classificationがL4-004 raw resultを抑止しない。
- self-repo L4 disabledのaggregate実行はskip、明示L4実行はforce-enableする。
- three `world:*` commandsがmain dispatch / known command set / helpで集合一致する。
- JSON modeのstdoutが一つのparse可能documentだけになり、exit 1でもresultを保持する。
- exit 0 / 1 / 2がnon-blocking / domain finding / execution failureへ安定して写像される。
- `world:pin` previewと`world:derive` pure modeがfilesystemを書き換えない。
- `world:pin --apply`と`world:derive --write`がatomic writeし、対象外control fileを変更しない。
- write report bytesがpure modeのraw report bytesと一致し、保存report改竄が再deriveを変えない。
- config不在ではcanonical roots、config存在時のunknown field / schemaではfallbackせずexit 2になる。
- declaration file不在はempty、存在するunknown schemaはfail-closedになる。
- session-start summaryが5件 / 2000文字を越えず、free textを含めない。

## 10. 未決事項の配置

ADR-037は委譲されていたfile name、report path、config key、validator ID、session-start limitを確定した。fragment / hashing / semantic debtの各項目はADR-032 / 033 / 035の決定を維持し、initial fingerprint countはWM-17実測とする。

attestation v2 `schemaVersion` / `predicateType` / v1 coexistenceだけはowner設計と不可分なためWM-23へ明示委譲し、Phase 0で値を先取りしない。
