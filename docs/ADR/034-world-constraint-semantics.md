---
adr_id: "034"
title: "World constraint semantics と endpoint-symmetric evaluation"
status: Proposed
date: 2026-07-16
---

# World constraint semantics と endpoint-symmetric evaluation

<!-- @work-item-id WI-284 -->

## Context

World Modelは、canonical snapshot上の明示関係とcontent pinから構造違反を再現可能に導出する必要がある。その際、`claimant depends-on premise`のようなfactには意味方向がある一方、claimantだけでなくpremiseの変更でも同じconstraintを再評価しなければ、前提側のdriftを見落とす。

既存`GateGraph`は`dependsOn`を有向辺としてduplicate / unknown dependency / level order / cycleを検査する。L4-001 `DriftDetectionService`はdesign / codeの集合差分を`design→code` / `code→design`として報告し、`SemanticDriftService`は明示`behaviorId`を用いてdesign / code / testを比較する。これらは明示構造の検査という先例だが、stable World node ID、両endpoint digest pin、snapshot identityを持つWorld constraintではない。

ADR-031はworld-modelが事実組立とconstraint evaluation、validator-systemがgate / blocking policyを所有すると決定した。ADR-032は`pgw:v1` ID、DeclaredKey、no-winner duplicate、single-hop explicit aliasを決定した。ADR-033はleaf digestと`corpusRoot` / `constraintRoot` / `evaluationId`を分離し、pinned endpoint digestをconstraintRootへ含めると決定した。本ADRはそれらを前提に、v1 constraint semanticsと構造ruleの限界を固定する。

## Decision

### 1. Typed directed factとendpoint-symmetric evaluationを分離する

明示relationは次の順序を持つ。

```text
claimant --factType--> premise
```

- `claimant`は宣言を行い、その整合を主張する側である。
- `premise`はclaimantの主張が参照する前提側である。
- v1のconstraint fact typeはexplicit `references`、`depends-on`、`refines`、`content-equals`に限定する。
- factのreverse edgeを生成せず、fact directionから逆向きの意味を推論しない。
- `content-equals`のpredicateが数学的に対称でも、claimant / premise orderはdeclaration provenanceとして保持する。

evaluationはendpoint-symmetricとする。claimantまたはpremiseのどちらかがchanged candidateになれば同じConstraintを再評価し、両endpointをcurrent snapshotから解決して全applicable ruleを評価する。この対称性は再評価trigger / coverageの性質であり、fact directionを対称化するものではない。

incremental schedulingは許可するが、そのserialized evaluation resultは全Constraintを再評価した結果と一致しなければならない。

### 2. ConstraintRecordは両endpointをNodePinとして固定する

v1 `ConstraintRecord`は次を必須とする。

```text
ConstraintRecord {
  constraintId: pgw:v1:constraint:<DeclaredKey>
  schemaVersion
  factType
  claimant: {
    nodeId: pgw:v1:<node-type>:...
    contentDigest: sha256:<64 lowercase hex>
  }
  premise: {
    nodeId: pgw:v1:<node-type>:...
    contentDigest: sha256:<64 lowercase hex>
  }
  applicableRuleIds: sorted non-empty WCR ID set
  declarationArtifactId
  declarationLocator
}
```

- `constraintId`はADR-032のDeclaredKey規則に従う。
- 両NodePinはdeclaration採用時に一意に存在するnodeから作る。missing / duplicate endpointから新規pinを作らない。
- content digestはADR-033のowner-aware normalization後のleaf digestである。
- pinは期待値であり、evaluation時にcurrent digestへ自動更新しない。
- alias解決後のnode ID / locatorはevaluation evidenceへ記録し、ConstraintRecordをmutationしない。
- `applicableRuleIds`はcanonical ID順にsortする。

canonicalized ConstraintRecordとdeclaration diagnosticsはADR-033の`constraintRoot`へ入る。current corpus facts、finding、obligation、last-evaluated time、repayment / blocking stateはConstraintRecordへ入れない。

corpus-wide ID uniquenessは明示Constraintがなくても常時評価するimplicit structural invariantである。ADR-032の`duplicate-node-id` extraction diagnosticをwinnerなしで受け取り、後述`WCR-005` violationへ投影する。duplicate candidateを偽の別IDへ書き換えてNodePinにしない。

### 3. 機械ruleを5種類の構造判定に限定する

v1の機械判定categoryは次だけとする。

1. **existence** — endpointが一意に存在するか、baselineから削除されたか、明示alias targetが存在するか。
2. **ID uniqueness** — canonical IDが一つのcandidateだけへ解決するか。
3. **explicit reference** — 宣言されたstable ID reference / relationが解決するか。
4. **declared dependency** — 明示された`depends-on` relationとendpointが解決するか。
5. **digest equality** — 各current endpoint digestがrecorded pinと一致するか。明示`content-equals`では両current digestも一致するか。

prose similarity、heading similarity、naming convention、co-change、timestamp、LLM classification、暗黙のdomain knowledgeから新しいfactやviolationを生成しない。意味的妥当性、因果、改善度を機械ruleに含めない。

malformed declarationのschema / type admissionは、これらのruleを安全に適用する前段の構造検査である。malformed inputを部分的なConstraintRecordとして評価へ流さない。

### 4. World constraint rule IDを`WCR-NNN`で固定する

v1 rulesetのstable IDを次のとおり定義する。

| rule ID | name | category / decision |
|---|---|---|
| `WCR-001` | `declaration-well-formed` | required field、ID、digest、fact type、rule IDがmalformed / unsupported |
| `WCR-002` | `endpoint-exists` | current snapshotにendpointがなく、baselineにも同一IDの存在証拠がない |
| `WCR-003` | `endpoint-not-deleted` | baselineにはexact endpointが存在し、currentではmissing、かつvalid explicit aliasがない |
| `WCR-004` | `explicit-rename-resolves` | rename continuityを主張するexplicit aliasがsingle-hop / target / role / uniqueness条件を満たさない |
| `WCR-005` | `node-id-unique` | 一つのcanonical node IDが複数locator / candidateへ解決する |
| `WCR-006` | `explicit-reference-resolves` | explicit reference / `refines` targetまたは宣言relationが解決しない |
| `WCR-007` | `declared-dependency-resolves` | explicit `depends-on` endpointまたは依存relationが解決しない |
| `WCR-008` | `endpoint-digest-equals` | claimant / premise current digestがpinと不一致、またはexplicit `content-equals`の両current digestが不一致 |

`WCR-001`はdeclaration admission、`WCR-002`〜`WCR-004`はexistence / explicit resolution familyであり、§3の5 category外の意味推論を追加しない。

rule ID namespaceは次を混同しない。

- ADR-032 extraction diagnostics: `duplicate-node-id`, `invalid-node-id`, `missing-reflection-target`等のlowercase code
- World constraint evaluation rules: `WCR-NNN`
- validator-system validator IDs: registryに登録された`Lx-NNN`

extraction diagnosticはcorpus / declarationをlosslessly説明し、WCR violationはconstraint evaluation結果を説明する。同一のduplicate事象が両方へ現れても、互換aliasにはせず、evaluation evidenceでsource diagnosticを参照する。

### 5. Missing、deletion、renameを推論せず区別する

一つのendpointのresolutionは次のprecedenceを持つ。

1. declarationがmalformedなら`WCR-001`。ConstraintRecordを作らない。
2. exact IDまたはalias targetがduplicateなら`WCR-005`。winnerを選ばない。
3. exact IDがcurrent snapshotに一意に存在すればresolved。
4. exact IDがなくexplicit aliasがあれば`WCR-004`で検証する。validならcanonical targetへsingle-hop解決し、`resolved-via-alias` evidenceを残す。
5. exact IDがbaseline snapshotに存在したなら`WCR-003` deletion。
6. それ以外は`WCR-002` missing endpoint。

同じendpointへ`WCR-002`と`WCR-003`を同時に出さない。unresolved endpointへdigest mismatchを追加しない。

path-based Artifact / SourceFile renameはADR-032どおりold missing + new addedであり、digest一致してもrenameとは呼ばない。explicit aliasがvalidな場合だけrename continuityを認める。explicit Fragmentは同一corpus role / DeclaredKeyを維持するfile moveやheading renameでidentityが変わらないため、rename ruleではなく同一nodeのlocator / digest changeとして扱う。

### 6. `refines`は明示stable ID declarationだけを事実化する

`refines` factはdeclarationがclaimant / premise両方のstable World node IDを明示し、両endpointが一意に解決した場合だけ生成する。

- same DeclaredKey、heading text / level / order、path、WorkItem、content digest、prose similarityから推論しない。
- ADR-032の`@world-reflects`が作る`proposal --reflected-as--> canonical`を自動的に`refines`へ変換しない。
- target不在 / relation不在は`WCR-006`、構文 / node type不正は`WCR-001`。
- 「より詳細になった」「置換した」「意味を保った」という判定は行わない。

product canonicalとinception proposalはADR-031どおり別artifact / corpus roleのままであり、`refines`やdigest equalityによってdeduplicateしない。

### 7. Change provenanceをsnapshot差とchanged candidatesで表す

evaluation evidenceは次の非因果的`ChangeProvenance`を持てる。

```text
ChangeProvenance {
  baselineSnapshotId: pgw:v1:snapshot:... | null
  baselineCorpusRoot: sha256:... | null
  currentSnapshotId: pgw:v1:snapshot:...
  currentCorpusRoot: sha256:...
  changedCandidates: [{
    nodeId
    changeKind: added | removed | modified | candidate-cardinality-changed
    baselineDigest?
    currentDigest?
    baselineLocators[]
    currentLocators[]
  }]
}
```

- baseline / currentはADR-033のSnapshot ID / `corpusRoot`を参照する。
- initial evaluationはbaselineを`null`にできる。
- changed candidatesはNode ID、change kind、locatorのcanonical tupleでsortする。
- candidateは再評価対象を説明するevidenceであり、「candidate Aがfinding Bを引き起こした」という因果ではない。
- path-based renameはold `removed` + new `added`。valid explicit aliasがある場合だけrename continuityを別evidenceとして表示する。
- digest一致、類似heading、近接commit / timestampからsuccessorやcauseを推論しない。

baseline snapshotは比較対象のWorld snapshotであり、ADR-035が定義するadoption baselineとは別物である。前者はchange evidence、後者は既知violation fingerprintのpolicy inputである。

### 8. Evaluation outputはpolicyを持たない

world-modelのevaluation DTOは最低限、`evaluationId`、`constraintId`、`ruleId`、claimant / premiseのdeclared pinとcurrent resolution evidence、source diagnostic、ChangeProvenanceを返す。

severity、blocking、exit code、waived / adopted classificationをconstraint evaluatorへ入れない。validator-system adapterがWorld evaluation DTOをvalidation resultへ変換し、ADR-031のownershipどおりpolicyを適用する。obligation / fingerprint / adoption / waiverはADR-035で決める。

### 9. §10のvalidator ID未決事項はADR-037へ委譲する

`docs/inception/_cross/WI-280/delivery_plan.md` §10の「world-modelのconfig keyとvalidator ID」はADR-037で決定する。config discovery、CLI、validator registry、layer、default enablement、output / exit codeを一緒に決める必要があるためである。

本ADRが決定するのはWorld内部rulesetの`WCR-NNN`だけであり、`L2-NNN` / `L3-NNN`を先取りしない。validator-systemの現行`ValidatorId`はregistryに列挙されたIDだけを受理するため、実装時の新validator ID追加はADR-037の決定と対応する正式WIで行う。

## Consequences

### Positive

- fact directionを失わず、claimant / premiseどちらのdriftも検出できる。
- 両endpoint pinにより、前提側だけの編集も同じconstraintで再現可能に評価できる。
- missing、deletion、explicit rename failure、duplicate、digest driftをstable rule IDで区別できる。
- `refines`やrenameを意味推論せず、明示宣言の範囲だけを機械保証できる。
- snapshot comparisonとadoption baselineを別概念に保てる。
- World rule、extraction diagnostic、layer validatorのID衝突を避けられる。

### Negative / Trade-off

- declaration採用時に両endpointのID / digestを明示pinする作業が必要になる。
- endpointの正当な変更でもpin更新reviewが必要になる。
- aliasなしのfile renameは意図したrenameでもold removed + new addedとして見える。
- prose上明白なrefinementやcausal relationを自動認定しないため、人による明示宣言が必要になる。
- baselineなしのinitial evaluationではmissingとdeletionを区別できず、missingとして扱う。

## Alternatives

- **fact edge自体を双方向化する** — dependency / referenceの意味方向を失い、reverse relationを誤って主張するため不採用。
- **claimantだけをpinする** — premise側変更を見落とし、endpoint-symmetric evaluationにならないため不採用。
- **content digestをnode identityにする** —編集ごとにendpoint identityが変わり、ADR-032と矛盾するため不採用。
- **digest / heading similarityからrenameやrefinesを推論する** —意味的continuityを機械が過剰主張し、曖昧candidateのwinner選択を生むため不採用。
- **既存`Lx-NNN`をWorld rule IDに流用する** —validator単位と個別constraint ruleを混同し、validator-system ownershipを侵すため不採用。
- **ci-governanceのSHA-1 path baselineをWorld adoption baselineに流用する** —artifact lifecycle、identity、hash algorithm、policy purposeが異なるため不採用。

## 関連要件・文書

- `docs/inception/_cross/WI-280/delivery_plan.md` §1, §3 WM-04, §7 ADR-034, §10
- `docs/inception/_cross/WI-284/description.md`
- `docs/inception/_cross/WI-284/logical_design.md`
- ADR-031（World ownership / corpus lifecycle）
- ADR-032（World node identity / alias / reflection）
- ADR-033（canonical snapshot / constraintRoot / evaluationId）
- ADR-005（ヘキサゴナルアーキテクチャ）
- ADR-027（成果物駆動状態導出）
