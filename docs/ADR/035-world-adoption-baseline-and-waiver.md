---
adr_id: "035"
title: "World adoption baseline、obligation、waiver"
status: Proposed
date: 2026-07-16
---

# World adoption baseline、obligation、waiver

<!-- @work-item-id WI-284 -->

## Context

World Modelは、current corpusとconstraint declarationsから構造violationを毎回再導出する。一方、導入時点のrepositoryには既存violationがあり得るため、全件を即時blockingにするとWorld Model自体を導入できない。既存violationだけを可視 debtとしてadoptし、新規claim / pinと壊れたdeclarationは初日から検査するratchetが必要である。

既存PhaseGateにも`.phasegate/baseline.json`がある。実装を確認すると、ci-governance `CreateBaselineUseCase`が対象pathを列挙してSHA-1を保存し、agent-integration `CiGovernanceBaselineGrandfatherAdapter`が現在fileのSHA-1と一致するpathだけをphase-gate / full-mode / story-reflection hookでgrandfatherする。schemaは`version: "1.0"`, `createdAt`, `algorithm: "sha1"`, `files[{path, sha1}]`であり、World node、WCR rule、violation fingerprint、evaluation identityを持たない。

coverage attestationには別のlegacy patternがある。`<!-- @coverage-gating: ungated-legacy -->`を持つcoverage reportをL2-016がwarningとして可視化し、markerのない新規bare claimはfail-closedにする。ただしmarkerはfile全体のowner-specific exemptionであり、stable semantic debt IDではない。

ADR-031はadoption baseline、waiver、explicit debt declarationを、人がreviewして採用する`external-declaration`とした。ADR-033は`evaluationId`へ`policyInputsDigest`を含め、obligation reportとmutable repayment stateをrootから除外した。ADR-034はpolicy-free evaluation DTO、`WCR-NNN`、ChangeProvenanceを決定した。本ADRはこれらを接続し、structural obligationの同一性、adoption、waiver、返済、semantic debt importを決定する。

## Decision

### 1. Constraint、violation、obligationのidentityを分離する

- `constraintId`は`pgw:v1:constraint:<DeclaredKey>`であり、人が宣言したConstraintRecordの同一性を表す。
- `violationFingerprint`は特定rulesetが特定の構造不一致を観測した同一性を表す。同じconstraintから複数fingerprintが生じ得る。
- obligationはcurrent evaluation findingから導出する作業項目であり、保存されたEntity identityを持たない。structural obligationの照合keyは`violationFingerprint`である。
- `evaluationId`はcorpus / constraint / policy inputを含む一回の導出入力identityであり、violation identityではない。

constraintを修正せずpin、observed digest、endpoint cardinality、rule semanticsのいずれかが変われば、同じ`constraintId`でもfingerprintは変わり得る。逆にmessage、locator、表示順だけの変更ではfingerprintを変えない。

### 2. `violationFingerprint`をsemantic evidenceから構成する

外部形式を次とする。

```text
pgw:v1:violation-fingerprint:sha256:<64 lowercase hex>
```

hexは次のcanonical JSONをADR-033のSHA-256 capabilityでhashした値である。

```text
{
  schemaVersion: "phasegate-world-violation-fingerprint/v1",
  rulesetVersion,
  ruleId,
  constraintId: string | null,
  factType: string | null,
  subject: {
    endpointRole: "claimant" | "premise" | "both" | "declaration" | "global",
    nodeIds: sorted stable World node IDs
  },
  claimantPin: { nodeId, contentDigest } | null,
  premisePin: { nodeId, contentDigest } | null,
  expected: rule-owned canonical evidence,
  observed: rule-owned canonical evidence
}
```

各`WCR-NNN`は`expected` / `observed`のversioned projectionをruleset contractとして定義する。

- missing / deletionは対象endpoint ID、role、pinを含み、current contentがなければ`observed`を明示missing valueにする。
- invalid aliasはalias ID、declared target、resolution defectを含む。
- duplicate IDはcanonical node ID、candidate cardinality、sorted candidate content-digest multisetを含み、locatorは含めない。
- reference / dependencyはfact typeと両endpointのdeclared tupleを含む。
- digest mismatchはexpected pinとobserved current digestを含む。endpointがさらに編集されればnew fingerprintになる。
- malformed declarationはparse可能なdeclaration identity、field / diagnostic code、invalid value digestを含め得るが、後述のとおりadoption / waiver対象にはしない。

fingerprintへ含めないもの:

- `evaluationId`, `corpusRoot`, `constraintRoot`, `policyInputsDigest`
- baseline / waiver / blocking / severity / adopted / repaid status
- human message、suggestion、array index
- PathKey、line、column、heading text等のlocator
- ChangeProvenanceのbaseline/current Snapshot ID、changed candidate reason
- `generatedAt`、clock、git commit、package version

`rulesetVersion`を含めるため、異なるrulesetのfingerprintを同一violationとして自動比較しない。

### 3. Obligation reportをimmutable derived outputとする

obligation reportは次の入力だけから毎回導出する。

```text
World evaluation DTO
+ adoption baseline declaration
+ waiver declarations
+ explicit semantic debt declarations
+ resolved policy effective date
```

reportは最低限、`schemaVersion`, `evaluationId`, `rulesetVersion`, `policyInputsDigest`と次の別collectionを持つ。

1. `structuralObligations` — current WCR findings。fingerprint、rule ID、constraint ID、endpoint evidence、policy classificationを持つ。
2. `repaidBaselineEntries` — baselineにはあるがcurrent findingsにないfingerprint。
3. `declaredSemanticDebts` — external declarationからimportした既知の意味的負債。
4. `policyDiagnostics` — invalid / expired waiver、ruleset mismatch、stale baseline等。

全collectionはstable ID / fingerprintでsortし、summary countはcollectionから導出する。reportに`generatedAt`を入れず、同じ入力からbyte-identicalにserializeする。

persistしたreportはADR-031の`generated-artifact`であり、source / control inputではない。

- 手編集しても次のderiveで上書きされ、gate結果を変えない。
- L3は保存reportを信頼せず、clean corpusとexternal declarationsから再導出する。
- report自身をWorld ingestion / fingerprint / policy inputへ含めない。
- report path、Git tracking、human / JSON formatterはADR-037で決定する。

### 4. `repaid`をcurrent set differenceとして導出する

同一rulesetのvalid baseline fingerprint集合を`B`、current structural violation fingerprint集合を`V`とする。

```text
adopted = B ∩ V
repaid  = B − V
new     = V − B
```

`repaid`はreport上のderived classificationであり、baseline entryへ`repaid`, `repaidAt`, `status`, `remaining`を保存しない。current evaluationが変われば毎回再計算する。

`repaid` entryは同じ変更でbaselineから削除し、再deriveする。stale entryを残すと同じfingerprintの再発を再びlegacy扱いできるため、validator-systemは`repaidBaselineEntries`をbaseline cleanup requiredとしてblockingする。削除後の再deriveではentry自体がなくなり、返済履歴はbaselineのGit diffとWork-Item trailerに残る。

### 5. Adoption baselineをclosed、monotonic-shrink declarationとする

adoption baselineはversioned external declarationであり、少なくとも次を持つ。正式file nameはADR-037へ委譲する。

```text
AdoptionBaseline {
  schemaVersion
  rulesetVersion
  sourceEvaluationId
  sourceCorpusRoot
  sourceConstraintRoot
  adoptedByWorkItemId
  adoptionReason
  entries: sorted [{
    violationFingerprint
    ruleId
    constraintId: string | null
  }]
}
```

これはADR-034 `ChangeProvenance.baselineSnapshotId`の比較snapshotとは別概念である。comparison baselineはnode change evidence、adoption baselineはknown violation fingerprintのpolicy inputであり、相互変換しない。

- `sourceEvaluationId`はbaseline採用前のcandidate evaluationを指す。baseline自身を含むevaluationIdへのself-referenceを作らない。
- entryはsource evaluationに実在し、人がlegacy structural debtとしてreviewしたfingerprintだけにする。
- `WCR-001` malformed declaration、invalid policy declaration、新規claim / pinに由来するfindingはadoption対象外。
- 同一ruleset内でbaseline entryを追加しない。返済による削除だけを許可する。
- commandがcandidateを生成しても自動採用せず、version control reviewと`adoptedByWorkItemId`を必要とする。
- duplicate fingerprint / unsupported schema / source identity欠落はfail-closed policy diagnosticとする。

このclosed-set ratchetにより、adoption後に発生したviolationをbaselineへ追記して非blocking化することを禁止する。例外が必要ならbaselineを拡張せず、§8のtime-bounded waiverを使う。

### 6. Legacyと新規のblocking policyを固定する

world-modelはADR-034のpolicy-free evaluation DTOからclassificationを導出し、validator-systemが次のblocking mappingを所有・適用する。

| condition | classification | validator policy |
|---|---|---|
| valid current fingerprintがsame-ruleset baselineに存在 | `adopted-legacy` | non-blocking warning。常にreportへ表示 |
| current fingerprintがbaselineにない | `new-structural` | default blocking |
| new claim / pinが全ruleを通過 | findingなし | pass。新規であること自体はfailureにしない |
| new claim / pinにfindingあり | `new-structural` | 初日からblocking。baseline追加不可 |
| `WCR-001` malformed / unsupported declaration | `invalid-declaration` | blocking、non-adoptable、non-waivable |
| baseline entryがcurrent setにない | `repaid` | baseline cleanup requiredとしてblocking。entry削除後にpass |
| exact active waiverあり | `waived` | non-blockingだがreportへ理由・期限・WIを表示 |
| waiver expired / invalid | `new-structural`または元classification | waiverを適用せず、元のpolicyで判定 |

新規claim / pinをfail-closedにするとは、validな追加を無条件blockすることではない。新規追加をlegacy baselineで免除せず、parse / resolution / pin / reference / dependency / digest ruleを全て通過しなければblockingするという意味である。

新規violationには別review済みwaiverを適用できるが、baselineへ恒久追記しない。`WCR-001`とpolicy input自体のmalformed / unsupported状態にはwaiverを適用できない。

### 7. Ruleset migrationではbaselineを自動carryしない

baselineの`rulesetVersion`とruntime rulesetが一致しない場合:

- old fingerprintをmatch対象にしない。
- version string置換、old hashの再label、rule IDだけによる自動carryを禁止する。
- baseline suppressionを適用せず、`baseline-ruleset-mismatch` policy diagnosticとしてfail-closedにする。

migrationは次のreviewed workflowとする。

1. new rulesetでcurrent corpusを評価し、新fingerprint集合を生成する。
2. old baseline entryごとに`carried`, `repaid`, `split`, `merged`, `removed-rule`を人が確認する。
3. still-accepted legacy debtだけからnew baseline candidateを作る。new rulesetで初めて発見されたviolationを自動adoptしない。
4. migration WIのreviewでold baselineをnew declarationへ原子的に置換する。
5. new declarationを含めて再deriveし、fingerprint集合とserialized reportの再現性を確認する。

fingerprintにrulesetVersionを含め、baselineにもrulesetVersionをpinすることでfalse continuityより明示migrationを優先する。

### 8. Waiverをexact、time-bounded external declarationとする

Waiverは次の必須fieldを持つ。正式file nameはADR-037で決定する。

```text
Waiver {
  schemaVersion
  waiverId: pgw:v1:waiver:<DeclaredKey>
  violationFingerprint
  reason
  expiresOn: YYYY-MM-DD
  workItemId: WI-<digits>
  renewalOf: waiverId | null
}
```

- targetはexact fingerprint一件。rule ID、constraint ID、path、Unit、globによるwildcard waiverを禁止する。
- `reason`はnon-emptyで、なぜ即時返済できないかと期限内のnext actionを記述する。
- `expiresOn`はUTC dateのexclusive boundaryとする。`policyAsOfDate < expiresOn`の間だけactiveで、同日以降はexpired。
- `workItemId`はinception全体で一意に解決するWorkItemでなければならない。
- waiver declarationの追加・変更はversion control review対象であり、runtime flagやreport手編集で生成しない。
- expired waiverは削除またはrenewするまでreportへ表示するが、violationを抑止しない。

renewalはexpiry fieldの無言延長ではなく、新しい`waiverId`とreview WIを持つrecordとして作る。`renewalOf`で直前waiverを参照し、reasonとexpiryを再評価する。旧recordは同じ変更でcurrent declaration集合から除き、履歴はGitと`renewalOf`で保持する。自動renewal、無期限expiry、predecessor scopeの暗黙継承を禁止する。

`renewalOf`は直前waiver IDへのaudit referenceであり、predecessorがcurrent declaration集合に残ることを要求しない。runtimeはrenewal chainを辿ってsuppression scopeを拡張せず、新record自身のexact fingerprint、expiry、WIだけを評価する。

### 9. Policy inputsを`evaluationId`へ結び付ける

ADR-033の`policyInputsDigest`を次で定義する。

```text
sha256(canonicalJson({
  schemaVersion: "phasegate-world-policy-inputs/v1",
  adoptionBaseline: canonical declaration | null,
  waivers: sorted canonical declarations,
  semanticDebts: sorted canonical declarations,
  policyAsOfDate: YYYY-MM-DD | null
}))
```

- baseline / waiver / semantic debtは人が採用するimmutable evaluation inputとしてsemantic fieldを全て含める。
- `policyAsOfDate`はwaiverが一件以上ある場合だけUTC dateを含め、waiverがなければ`null`とする。
- `policyAsOfDate`はreport生成時刻ではなく、expiry判定を変える明示的なresolved policy inputである。同じderive中に一度だけ解決し、全waiverへ同じ値を使う。
- `generatedAt`, current timestamp、duration、mtimeは含めない。
- declaration file path、JSON formatting、array input orderは含めない。

したがってbaseline entry、waiver、semantic debt、waiver有効日の変更は`policyInputsDigest`と`evaluationId`を変える。一方、raw WCR findingと`violationFingerprint`はpolicyから独立し、同じ構造violationを維持する。

invalid / unsupported policy declarationはempty inputへfallbackしない。trustworthyな`policyInputsDigest` / obligation classificationを生成せず、validator-systemへfail-closed diagnosticを返す。

ADR-033が除外したclock metadataと矛盾させないため、`policyAsOfDate`を観測時刻metadataではなくwaiver semanticsの入力として限定する。CLIのdefault / override方法はADR-037、testではinjectable dateを使う。

### 10. Semantic debtをstructural obligationと分離する

explicit semantic debtは、人が既知の意味的不足を宣言しWorldへimportするexternal declarationである。機械がWCR factsから発見したとは表現しない。

```text
SemanticDebtDeclaration {
  schemaVersion
  debtId: pgw:v1:semantic-debt:<DeclaredKey>
  kind: "semantic"
  title
  reason
  ownerUnit
  introducedByWorkItemId
  references: sorted World node IDs
}
```

- `debtId`はADR-032のDeclaredKey syntaxを使い、`<unit>.<topic>`を推奨する。同一projectで一意とする。
- declarationがcurrent集合に存在することをactive debtとする。`repaid` / `resolvedAt` stateを保存しない。
- 返済時はresolution WIでdeclarationとsource annotationを削除する。履歴はGitとWork-Item trailerに残す。
- semantic debtは`violationFingerprint`を持たず、adoption baseline / waiver対象にしない。
- semantic debt declarationはstructural violationを抑止しない。同じ箇所にWCR findingがあれば別collectionに両方表示する。
- reportは`declaredSemanticDebts`を「declared/imported」と表示し、`detected`, `rediscovered`, `repaid structural obligation`という表現を使わない。

### 11. §10のsemantic debt ID / coverage report記法へ回答する

explicit semantic debt IDには`pgw:v1:semantic-debt:<DeclaredKey>`を採用する。既存coverage reportからexternal declarationを参照するfile-level annotationは次とする。

```markdown
<!-- @world-semantic-debt pgw:v1:semantic-debt:skill-quality.coverage-attestation-legacy -->
```

- optional YAML frontmatterとdocument H1の後、最初のprose / tableより前のfile-level metadata blockへ置く。
- repeatableとし、一commentにつき一debt IDを記述する。
- annotationはexternal declarationへのreferenceであり、debtのreason / owner / WIをMarkdownへ複製しない。
- `<!-- @coverage-gating: ungated-legacy -->`と併存できるが、置き換えない。owner-specific markerのL2-016 exemption semanticsを変更しない。
- `@world-semantic-debt`はattestation、waiver、adoption baselineではなく、bare claimをgreenにしない。

external declarationの正式file name / schema pathはADR-037へ委譲する。WM-17で実corpusをinventoryし、既知coverage gapをこのIDで宣言・annotation参照してからWorld reportへimportする。本ADRでは既存coverage reportを編集しない。

### 12. 既存PhaseGate baselineとは統合しない

既存`.phasegate/baseline.json`とWorld adoption baselineは別owner / schema / lifecycleを維持する。

| concern | existing PhaseGate baseline | World adoption baseline |
|---|---|---|
| owner / consumer | ci-governance + agent-integration hook | world-model evaluation、validator-system policy adapter |
| identity | project-relative path | `violationFingerprint` |
| digest | raw/current file SHA-1 | ADR-033 semantic SHA-256 evidence |
| purpose | unchanged legacy pathのhook grandfather | known structural violationのvisible non-blocking adoption |
| lifecycle | file bytes変更でgrandfather失効、`--force` overwriteあり | initial closed set、same-ruleset追加禁止、返済で削除 |
| config | current top-level `baseline.enabled/path` | ADR-037で別config / file discoveryを決定 |

World側から既存baseline fileをimport、upgrade、rewriteしない。同じpathに両者を保存せず、既存`baseline-reset` / `phasegate baseline` commandの意味も変更しない。

## Consequences

### Positive

- obligation reportを手編集可能なstateではなく、再現可能なderived outputにできる。
- legacy structural debtだけを導入時にadoptし、新規violationのbaseline launderingを防げる。
- 返済をcurrent set differenceで導出し、stale baselineによる再発の再免除を防げる。
- exact fingerprint / expiry / WIを持つwaiverにより、例外を局所的かつ期限付きにできる。
- ruleset変更時のfalse continuityを避け、人によるmigration reviewを要求できる。
- explicit semantic debtを機械検出したstructural obligationと混同せず表示できる。
- 既存path / SHA-1 hook baselineの互換性を維持できる。

### Negative / Trade-off

- baseline採用、ruleset migration、waiver renewalにreview WIが必要になる。
- repaid entryを削除するまでbaseline cleanupがblockingになる。
- observed digestやcandidate cardinalityが変わると、同じconstraintでもnew fingerprintとしてblockingになり得る。
- active waiverがある間はUTC policy dateがevaluation identityへ影響する。
- reportにstructural obligation、repaid entry、semantic debt、policy diagnosticの複数sectionが必要になる。

## Alternatives

- **obligation reportへ`repaid`を保存する** — report改竄やstale stateがcurrent evaluationを上書きするため不採用。
- **same-ruleset baselineへのentry追加を許可する** —新規violationを後からlegacy化でき、ratchetが成立しないため不採用。
- **fingerprintをconstraintIdだけにする** —一constraintの複数rule / endpoint driftを区別できないため不採用。
- **fingerprintへpath / line / messageを含める** —locator変更や文言修正だけでlegacy identityが壊れるため不採用。
- **ruleset versionを無視してold baselineを適用する** —rule semantics変更後にfalse matchを作るため不採用。
- **waiverをrule / path globで指定する** —将来の未知violationまで免除するため不採用。
- **既存`.phasegate/baseline.json`を拡張する** —path hook grandfatherとWorld violation adoptionのowner / identity / hash / lifecycleが異なるため不採用。
- **`ungated-legacy` markerをsemantic debt IDとして流用する** —file-wide booleanであり、project-global ID、reason、owner、WI traceabilityを持たないため不採用。

## 関連要件・文書

- `docs/inception/_cross/WI-280/delivery_plan.md` §1, §3 WM-04, §7 ADR-035, §10
- `docs/inception/_cross/WI-284/description.md`
- `docs/inception/_cross/WI-284/logical_design.md`
- ADR-031（external declaration / ownership）
- ADR-032（DeclaredKey / World node identity）
- ADR-033（evaluationId / policyInputsDigest / canonicalization）
- ADR-034（WCR rules / ChangeProvenance / policy-free evaluation DTO）
- ADR-027（成果物駆動状態導出）
- ADR-030（coverage attestation / ungated-legacy ratchet）
