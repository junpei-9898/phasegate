---
traceability:
  initial_creation: true
---

# Unit Test Design: world-model

<!-- @work-item-id WI-285 -->

> **Unit ID**: world-model  
> **作成日**: 2026-07-16  
> **対応ストーリー**: H17-01〜H17-10  
> **状態**: 実装予定のテスト設計（テスト実装済みを意味しない）

---

## 1. Test policy

- test case名（`describe` / `context` / `it`相当）は日本語で仕様を表す。
- 全caseをArrange / Act / Assertに分け、Actは原則1回とする。
- domain Entity / Value Object / Domain Serviceをmockしない。実体とdeterministic fixtureを使う。
- application use caseではI/O portだけをfake / spy化し、domain結果そのものをstubしない。
- production canonical serializerとは別に構築したfixed bytes / golden digestをexpectedにする。
- filesystem / owner facade / CLI processを跨ぐ検証は`it_test_design.md`へ置き、unit testではport境界までを対象にする。
- test sourceには実装対象Storyの`@story H17-XX`を付ける予定とする。

### AAA template

```text
Arrange: immutable domain object、fixed bytes、fake port responseを準備する
Act: target method / use caseを1回呼ぶ
Assert: public result、canonical bytes、port call、diagnosticを検証する
```

## 2. WI-283 canonicalization test carry-over

以下の`UT-WM283-*`を本Unitの必須test designとして包含する。IDと期待contractを維持し、実装WIで対応Storyへbindingする。

### 2.1 CanonicalJsonSerializer

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM283-CAN-001 | 入れ子objectのkey挿入順が違ってもcanonical bytesを同一にする | bytesが一致する |
| UT-WM283-CAN-002 | ordered arrayの順序差をcanonical bytesへ反映する | bytesが異なる |
| UT-WM283-CAN-003 | set-valued nodeをID順に投影する | 列挙順が違ってもbytesが一致する |
| UT-WM283-CAN-004 | escape対象文字を空白なしUTF-8 JSONへ変換する | `JSON.stringify` semanticsと一致する |
| UT-WM283-CAN-005 | explicit nullとfield absenceを区別する | bytesが異なる |
| UT-WM283-CAN-006 | 非対応JSON値をcanonicalization errorにする | undefined / sparse / NaN / Infinity / bigintを拒否する |
| UT-WM283-CAN-007 | canonical bytesへ装飾を混ぜない | BOM / indentation / trailing newlineがない |

### 2.2 TextContentNormalizer

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM283-TXT-001 | LF・CRLF・lone CRを同じLF bytesへ正規化する | normalized bytesが一致する |
| UT-WM283-TXT-002 | NFCとNFDを別contentとして保持する | bytesとleaf digestが異なる |
| UT-WM283-TXT-003 | trailing whitespace差を保持する | leaf digestが異なる |
| UT-WM283-TXT-004 | final newline有無を保持する | leaf digestが異なる |
| UT-WM283-TXT-005 | UTF-8 BOM有無を保持する | leaf digestが異なる |
| UT-WM283-TXT-006 | invalid UTF-8をhard extraction diagnosticにする | replacement characterで続行しない |
| UT-WM283-TXT-007 | fragment marker metadataをcontent range digestへ混ぜない | identity factだけが変わる |

### 2.3 Path / symlink normalization

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM283-PATH-001 | dotと重複separatorをADR-032 PathKeyへ正規化する | canonical relative pathになる |
| UT-WM283-PATH-002 | absolute・drive letter・backslash・親脱出pathを拒否する | path diagnosticになる |
| UT-WM283-PATH-003 | checkout root差をsemantic bytesから除外する | bytesが一致する |
| UT-WM283-PATH-004 | filesystem列挙順に依存しない | nodesとrootが一致する |
| UT-WM283-PATH-005 | symlinkをfollowせずlink target factにする | target contentを読まない |
| UT-WM283-PATH-006 | broken・cyclic・root外symlinkをtraverseしない | diagnosticを返す |
| UT-WM283-PATH-007 | caseだけ異なるpathを暗黙mergeしない | 別IDまたはcase-fold collision diagnosticになる |
| UT-WM283-PATH-008 | Unicode normalizationだけ異なるpathを別値にする | opaque PathKeyを保持する |

### 2.4 CorpusRoot

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM283-CR-001 | nodes・edges・diagnosticsの列挙順をrootから除外する | corpusRootが一致する |
| UT-WM283-CR-002 | leaf content変更をrootへ反映する | corpusRootが変わる |
| UT-WM283-CR-003 | extractorVersion変更をrootへ反映する | corpusRootが変わる |
| UT-WM283-CR-004 | snapshot schemaVersion変更をrootへ反映する | corpusRootが変わる |
| UT-WM283-CR-005 | corpus-relevant config変更をrootへ反映する | corpusRootが変わる |
| UT-WM283-CR-006 | outputDir・blocking severityをcorpusRootから除外する | corpusRootが変わらない |
| UT-WM283-CR-007 | generatedAt・absolute root・Git SHA・mtimeを除外する | corpusRootが変わらない |
| UT-WM283-CR-008 | root自己fieldをpreimageから除外する | root付与前後で導出値が変わらない |
| UT-WM283-CR-009 | obligation report手編集をcorpusRoot入力にしない | corpusRootが変わらない |

### 2.5 Owner-aware generated artifact projection

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM283-GEN-001 | matrix generatedAtだけの差をleaf digestから除外する | digestとcorpusRootが一致する |
| UT-WM283-GEN-002 | matrixのset-valued Story・AC・TestReferenceを安定sortする | semantic digestが一致する |
| UT-WM283-GEN-003 | matrix binding等のsemantic field変更を観測する | digestが変わる |
| UT-WM283-GEN-004 | attestation producedAt・gitCommit・signatureを除外する | evidence projection digestが一致する |
| UT-WM283-GEN-005 | attestation gate outcome変更を観測する | projection digestが変わる |
| UT-WM283-GEN-006 | owner DTOのunknown fieldを黙ってdropしない | diagnosticになる |

### 2.6 ConstraintRoot / EvaluationId

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM283-KR-001 | constraint・claim・alias列挙順をconstraintRootから除外する | constraintRootが一致する |
| UT-WM283-KR-002 | pinned endpoint digest変更をconstraintRootへ反映する | constraintRootが変わる |
| UT-WM283-KR-003 | rulesetVersion変更を両rootへ反映する | constraintRootとevaluationIdが変わる |
| UT-WM283-EV-001 | corpusRoot変更をevaluationIdへ反映する | evaluationIdが変わる |
| UT-WM283-EV-002 | constraintRoot変更をevaluationIdへ反映する | evaluationIdが変わる |
| UT-WM283-EV-003 | policyInputsDigest変更をevaluationIdへ反映する | evaluationIdが変わる |
| UT-WM283-EV-004 | finding順・report formattingをevaluationIdから除外する | evaluationIdが変わらない |
| UT-WM283-EV-005 | 同じEvaluationInputを再導出する | evaluationIdがbyte-identicalになる |

### 2.7 Hashing boundary

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM283-HASH-001 | known bytesを公開SHA capabilityでhashする | known lowercase SHA-256 digestを返す |
| UT-WM283-HASH-002 | non-ASCII textをUTF-8 helperでhashする | `TextEncoder` bytesのdigestと一致する |
| UT-WM283-HASH-003 | plain digestをWorld-local Sha256Digestへ変換する | prefix・長さ・caseを検証して生成する |
| UT-WM283-HASH-004 | plain digestをattestation-local Digestへ変換する | attestation所有VOへ局所変換する |
| UT-WM283-HASH-005 | world-model import graphでattestation deep importを拒否する | domain / infrastructure importがない |
| UT-WM283-HASH-006 | World導入でnode:crypto SHA-256実装を増やさない | source scanで新規call siteがない |

### 2.8 Determinism acceptance

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM283-DET-001 | 同一fixtureを2回Snapshot化する | canonical JSONとcorpusRootがbyte-identicalになる |
| UT-WM283-DET-002 | 列挙順・key順・checkout root・改行差を変える | corpusRootが一致する |
| UT-WM283-DET-003 | semantic node contentを1件変更する | 対応leaf digestとcorpusRootだけが変わる |

## 3. Identity and graph tests

| ID | 日本語テストケース名 | Arrange / Act / Assert要点 |
|---|---|---|
| UT-WM285-ID-001 | artifact kind・role・pathからArtifact IDを生成する | valid valuesを生成し、exact `pgw:v1` IDをassertする |
| UT-WM285-ID-002 | file identityとfragment identityを別IDにする | 同一fileのexplicit Fragmentを生成し非等価をassertする |
| UT-WM285-ID-003 | heading textとorder変更でexplicit Fragment IDを変えない | marker key固定でheadingを変更しID一致をassertする |
| UT-WM285-ID-004 | legacy fileにwhole-file Fragmentを一つ生成する | markerなしfileを抽出しlocatorと親artifactをassertする |
| UT-WM285-ID-005 | migration complete後のlegacy fallbackを拒否する | complete宣言とmarker欠落を与えdiagnosticをassertする |
| UT-WM285-ID-006 | 同一type・roleのDeclaredKey重複でwinnerを選ばない | duplicate inputからambiguity diagnosticだけをassertする |
| UT-WM285-ID-007 | aliasなしrenameをremovedとaddedにする | baseline/current pathを比較し2 candidateをassertする |
| UT-WM285-ID-008 | explicit single-hop aliasでcontinuity候補を表す | valid aliasを評価しedgeとprovenanceをassertする |
| UT-WM285-ID-009 | alias chain・cycle・ambiguous targetを拒否する | invalid aliasesを評価しdiagnosticをassertする |
| UT-WM285-GRAPH-001 | directed edgeのclaimantとpremiseを保持する | edge作成後にendpoint順をassertする |
| UT-WM285-GRAPH-002 | productとinceptionの同digest artifactを統合しない | role違いの2 nodeが残ることをassertする |
| UT-WM285-GRAPH-003 | proposalとcanonicalをexplicit reflectsだけで接続する | annotation有無を変えedge有無をassertする |
| UT-WM285-GRAPH-004 | artifact kind違いの同digest nodeを統合しない | source / generated nodeの別identityをassertする |

## 4. WCR rule tests

各ruleはdomain実体の`ConstraintRecord` / `Snapshot`で検証し、`ConstraintEvaluator`をmockしない。

### WI-293 executable WCR mutation pairs

<!-- @work-item-id WI-293 -->

@story-id H17-07

`UT-WI293-*`はNodePin / ChangeProvenance / ConstraintRecordのinvariant、WCR-001〜008、claimant-only / premise-only digest mutation、missing / deletion排他、alias有無rename、duplicate no-winner、explicit-only refines、malformed no-partial-record、incremental / full canonical equalityをdomain実体だけで検証する。テストファイルはH17-07のAC-1〜6へ明示`@ac` bindingを持たせる。

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM285-WCR-001 | malformed declarationをWCR-001でadmission拒否する | 他rule評価へ流さない |
| UT-WM285-WCR-002 | baselineなしmissing endpointをWCR-002にする | deletionと分類しない |
| UT-WM285-WCR-003 | baselineに存在しcurrentで消えたendpointをWCR-003にする | snapshot IDsとchanged candidateを保持する |
| UT-WM285-WCR-004 | 無効なexplicit rename continuityをWCR-004にする | aliasなしrenameは対象外 |
| UT-WM285-WCR-005 | duplicate node IDをWCR-005にする | winnerを選ばない |
| UT-WM285-WCR-006 | unresolved explicit referenceをWCR-006にする | claimant / premiseのIDとdigestを保持する |
| UT-WM285-WCR-007 | declared dependency欠落をWCR-007にする | 意味的dependencyを推論しない |
| UT-WM285-WCR-008 | endpoint pin digest不一致をWCR-008にする | observed / expected digestを保持する |
| UT-WM285-WCR-009 | content-equals endpoint間digest不一致をWCR-008にする | 両endpoint pinを保持する |
| UT-WM285-WCR-010 | explicit refinesだけをfact化する | prose類似だけではedgeを作らない |
| UT-WM285-WCR-011 | change provenanceで因果を主張しない | baseline/current/candidateだけを返す |

## 5. Obligation / policy tests

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM285-OBL-001 | current evaluationからrepaidを毎回導出する | persisted repayment stateを読まない |
| UT-WM285-OBL-002 | baselineへ新規fingerprintを追加できない | closed-set violationをblockingにする |
| UT-WM285-OBL-003 | baselineの返済済みentry残置をcleanup-requiredにする | reportへblocking cleanupを出す |
| UT-WM285-OBL-004 | observed digest変化を新fingerprintにする | old baselineで免除しない |
| UT-WM285-OBL-005 | rulesetVersion変更時にbaselineを暗黙移行しない | migration-required resultを返す |
| UT-WM285-OBL-006 | 有効なwaiverでexact fingerprintだけをwaiveする | reason・expiry・WIをreportへ保持する |
| UT-WM285-OBL-007 | 期限切れwaiverをblockingへ戻す | policyAsOfDate境界をassertする |
| UT-WM285-OBL-008 | WCR-001とmalformed policy inputをwaiveしない | non-waivable classificationを返す |
| UT-WM285-OBL-009 | semantic debtとstructural obligationを別categoryにする | 両方を別collectionで返す |
| UT-WM285-OBL-010 | report手編集値を次回評価へ戻さない | report repository readが0回であることをassertする |

## 6. Application use case tests

| ID | 日本語テストケース名 | Port fake / spy | Assert |
|---|---|---|---|
| UT-WM285-APP-001 | owner projectionからSnapshotを構築する | corpus read ports、hash fake | stable node / edge / rootを返す |
| UT-WM285-APP-002 | hard extraction diagnostic時にtrustworthy Snapshotを返さない | invalid bytes fake | failure resultとdiagnosticを返す |
| UT-WM285-APP-003 | inspectでdeclarationとreportを書かない | repository spies | write callが0回 |
| UT-WM285-APP-004 | pin previewでcandidateだけを返す | constraint repository spy | save callが0回 |
| UT-WM285-APP-005 | pin applyで一意解決したcandidateをatomic保存する | repository spy | exact candidateでsaveが1回 |
| UT-WM285-APP-006 | ambiguous pin applyで保存しない | duplicate endpoint fixture | exit分類1、save callが0回 |
| UT-WM285-APP-007 | derive pureでimmutable reportを返し書かない | report writer spy | write callが0回 |
| UT-WM285-APP-008 | derive writeで同じraw report bytesを保存する | report writer spy | pure resultとbytesが一致する |
| UT-WM285-APP-009 | write failureをtrustworthy successにしない | failing writer fake | execution分類2を返す |
| UT-WM285-APP-010 | unknown declaration schemaをempty inputにしない | repository fake | fail-closed分類2を返す |

## 7. Presentation unit tests

| ID | 日本語テストケース名 | Assert |
|---|---|---|
| UT-WM285-CLI-001 | `--json`を`--format json`として解析する | 同じformat valueを返す |
| UT-WM285-CLI-002 | 矛盾するformat flagをusage errorにする | exit 2とstderr contractを返す |
| UT-WM285-CLI-003 | JSON modeで単一envelopeだけをstdoutへ出す | schemaVersion / command / code / data / diagnosticsをassertする |
| UT-WM285-CLI-004 | expected domain failureをstdoutへ完全出力する | exit 1でresultが欠落しない |
| UT-WM285-CLI-005 | `--out`単独指定をusage errorにする | exit 2、writer未呼出をassertする |
| UT-WM285-CLI-006 | inspect handlerを常にread-onlyで実行する | mutation intentがないことをassertする |
| UT-WM285-CLI-007 | pinの`--apply`とderiveの`--write`を混同しない | command別intentをassertする |

## 8. Planned test layout

```text
scripts/harness/__tests__/unit/world-model/
├── domain/
│   ├── identity/
│   ├── canonicalization/
│   ├── snapshot/
│   ├── constraints/
│   └── obligations/
├── application/
└── presentation/
```

test file名はkebab-caseとし、case IDをコメントまたはtest name metadataで追跡可能にする。実装順はH17 / WMのincrementに合わせ、未実装caseをpass済みとして記録しない。

---

## 9. WI-286 hashing test allocation

<!-- @work-item-id WI-286 -->

@story-id H17-01

| ADR-033 Case | WM-06 responsibility | Later World responsibility |
|---|---|---|
| UT-WM283-HASH-001 | public capability known bytes | World port contract reuse |
| UT-WM283-HASH-002 | public UTF-8 helper | World text normalization reuse |
| UT-WM283-HASH-003 | plain digest contractまで | World-local VO conversion |
| UT-WM283-HASH-004 | attestation-local adapter conversion | — |
| UT-WM283-HASH-005 | public export boundary | World import graph |
| UT-WM283-HASH-006 | no-new-crypto source scan |継続ratchet |

WM-06ではWorld source testを作らず、provider側のcontract / adapter testで上表の左列を満たす。

## 10. WI-287 implemented test allocation

<!-- @work-item-id WI-287 -->

@story-id H17-02

WM-07ではUT-WM283のCAN / TXT / PATH lexical subset / CR / KR / EV / DETと、World-local HASH-003をdomain unit testとして実装する。testはproduction domain objectの実体とtest-local deterministic `WorldHashingPort`を使い、mock frameworkや`node:crypto`を使わない。

| Test file | Covered contract |
|---|---|
| `world-node-id.test.ts` | ADR-032全ID形式、round-trip、file / fragment identity分離 |
| `path-key.test.ts` | POSIX lexical normalization、case / Unicode保持、invalid path |
| `canonical-json-serializer.test.ts` | UT-WM283-CAN-001〜007 |
| `text-content-normalizer.test.ts` | UT-WM283-TXT-001〜006 |
| `world-node.test.ts` | Artifact / SourceFile / Fragment projection |
| `snapshot-root-deriver.test.ts` | CR / KR / EV / DET、stable set sort、three-root separation |

symlink traversal、fragment marker content range、matrix / attestation owner-aware projectionはdomain-only WM-07の実装済みtestとして主張せず、WM-09/10のintegration fixtureへ継続する。

## 11. WI-289 design corpus extractor tests

<!-- @work-item-id WI-289 -->

@story-id H17-04

| Test file | Covered contract |
|---|---|
| `markdown-design-fact-extractor.test.ts` | metadata prelude、orphan / malformed、whole-file / mixed / explicit、LF normalization |
| `traceability-design-fact-adapter.test.ts` | public plain DTOからWorkItem / Unit / Story index、provider diagnostic lossless変換 |
| `design-corpus-fact-extractor.test.ts` | duplicate no-winner、role別WI edge、explicit reflection resolution、deterministic order |

domain objectは実体を使い、hashingだけをtest-local deterministic portで制御する。test名は日本語、AAAを明示し、expected ID / diagnosticをliteralで検証する。

## 12. WI-290 runtime / evidence extractor tests

<!-- @work-item-id WI-290 -->

@story-id H17-05

| Test file | Covered contract |
|---|---|
| `source-metadata-fact-extractor.test.ts` | implementation / test排他分類、metadata、invalid UTF-8 / symlink |
| `matrix-fact-extractor.test.ts` | generatedAt除外、owner sort、TestReference ID、duplicate / schema diagnostic |
| `attestation-fact-extractor.test.ts` | public DTO / verification status、volatile / signature除外 |
| `integrity-manifest-fact-extractor.test.ts` | v1 path / raw digest projection、invalid / not-present |
| `world-node.test.ts`追補 | TestReference projection factory |

domain実体とdeterministic hashingを使用し、provider boundaryだけをplain fake DTO / handlerで制御する。

## 13. WI-291 assembly / inspection tests

<!-- @work-item-id WI-291 -->

@story-id H17-06

| Test file | Covered contract |
|---|---|
| `build-snapshot-use-case.test.ts` | multi-source merge、global duplicate no-winner、edge dedup / dangling endpoint、order determinism |
| `inspect-world-use-case.test.ts` | plain DTO、inventory / count、stable projection、hard diagnostic classification |
| `world-inspect-command-handler.test.ts` | human / JSON、flag conflict、exit 0 / 1 / 2、byte-identical format |
| `attestation-sha256-world-hashing-adapter.test.ts` | public plain digestからWorld-local `Sha256Digest`への変換 |

application portはdeterministic fakeを使用し、World domain object / serializer / root deriverは実体で検証する。

## WI-292 Matrix lifecycle projection tests

<!-- @work-item-id WI-292 -->

matrix 1.2 status / lifecycle包含、1.1 required fallback、status差によるdigest差、unknown lifecycle field / valueのdiagnosticを検証する。

## WI-294 declaration mapper tests

<!-- @work-item-id WI-294 -->

@story-id H17-08

valid constraintsをWM-12 domain型へ変換し、malformed supported recordとduplicate constraint IDをpartial recordなしのWCR-001 inputへ隔離する。baseline / waiver / semantic debtはADR-035の必須field、ID / digest / date / WI形式、set array canonical sortを検証し、duplicate fingerprint / IDではwinnerを作らない。input array順を変えてもcanonical projectionが一致することを確認する。

## WI-295 fingerprint / obligation tests

<!-- @work-item-id WI-295 -->

@story-id H17-09

ADR-035のfingerprint 10-field preimage、locator / message / evaluation ID除外、observed digest / duplicate multiset変化を検証する。policy digestはwaiver 0件のdate null、waiverありdate必須、declaration set sortを固定する。baseline intersection / difference、active / expired exact waiver、WCR-001 non-waivable、ruleset mismatch、semantic debt別collectionをdomain実体で検証する。

application testはinvalid repository resultでreportを作らないこと、pure modeでwriterを呼ばないこと、write modeがpureと同じbytesだけを一度渡すことを確認する。

## WI-296 pin / derive command tests

<!-- @work-item-id WI-296 -->

@story-id H17-10

pin use caseはpreview / apply、exact / alias、missing / duplicate / malformed、unknown schema / write failureを検証する。derive integrationはempty declaration、constraintRoot、WCR finding、report persistenceを検証する。presentation testはformat conflict、out-without-write、domain exit 1、execution exit 2、single JSON envelopeとstable human section順を固定する。
## WI-297: Comparison seam tests

<!-- @work-item-id WI-297 -->

| ID | ケース | 期待 |
|---|---|---|
| UT-WM297-CMP-001 | comparison baseline省略 / 指定 | WCR-002 / WCR-003の既存rule境界を維持する |
| UT-WM297-CLK-001 | fixed PolicyDatePort | waiver全件へ同じUTC dateを一度だけ供給する |
## WI-298: Baseline set invariants

<!-- @work-item-id WI-298 -->

| ID | ケース | 期待 |
|---|---|---|
| UT-WM298-INV-001 | unique sorted measured set | duplicate fingerprint 0、count不変 |
| UT-WM298-ADM-001 | baseline/current exact set | added / missing entry 0 |
| UT-WM298-DEBT-001 | semantic debt import | structural collectionと混在しない |

## WI-300 World config boundary tests

<!-- @work-item-id WI-300 -->

canonical defaults、完全resolved input、custom corpus / provider / declaration / output path、invalid path rejectionを検証する。`enabled`切替でexplicit use case / handlerの構成が変わらないことも確認する。
