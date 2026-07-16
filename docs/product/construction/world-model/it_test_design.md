---
traceability:
  initial_creation: true
---

# Integration Test Design: world-model

<!-- @work-item-id WI-285 -->

> **Unit ID**: world-model  
> **作成日**: 2026-07-16  
> **対応ストーリー**: H17-01, H17-03〜H17-12  
> **状態**: 実装予定のintegration test設計（テスト実装済みを意味しない）

---

## 1. Scope and policy

integration testは次の境界を実adapterで検証する。

- filesystem traversal、UTF-8 / newline normalization、Markdown fragment extraction
- traceability / matrix / attestation / integrity public facadeからconsumer ACLへの変換
- external declaration JSON repositoryのschema admissionとatomic write
- public SHA-256 capabilityとWorld hashing adapter
- CLI dispatch、stdout / stderr、exit code、read-only / write side effect
- checkout root、列挙順、改行、実行回数に対するdeterminism

各test case名は日本語、Arrange / Act / Assertを分離する。domain層をmockせず、project fixtureと実domain serviceを使う。外部process境界が不要なadapter testではowner public facadeのcontract fixtureを使い、provider内部型をfixtureへ持ち込まない。

## 2. Fixture strategy

### 2.1 Planned fixture layout

```text
scripts/harness/__tests__/fixtures/world-model/
├── minimal-valid/
│   ├── docs/product/
│   ├── docs/inception/
│   ├── docs/ADR/
│   ├── scripts/harness/
│   └── phasegate.config.json
├── explicit-fragments/
├── legacy-whole-file/
├── duplicate-identities/
├── invalid-utf8/
├── symlinks/
├── generated-owner-projections/
├── constraints-valid/
├── constraints-invalid/
├── policy-inputs/
└── cli-project/
```

fixtureは最小のself-contained repository treeとし、absolute temp path、mtime、current clock、Git metadataをgoldenへ含めない。symlink fixtureはplatform capabilityを事前検査し、作成不能環境では明示skip reasonを返す。

### 2.2 Golden data

- canonical JSON bytesとknown SHA-256 digestをversioned fixtureとして対にする。
- expected bytesはproduction serializerからtest setup中に生成しない。
- owner projection fixtureはschemaVersionとsemantic / volatile fieldを明示する。
- policy expiry caseはfixed `policyAsOfDate`を注入しwall clockを使わない。
- order-shuffled variantは同じsemantic setを異なるfilesystem / JSON orderで表す。

## 3. Extractor integration tests

| ID | 日本語テストケース名 | Fixture / boundary | Assert |
|---|---|---|---|
| IT-WM285-EXT-001 | productとinceptionを別corpus roleで抽出する | minimal-valid | 同digestでも別Artifact / Fragmentになる |
| IT-WM285-EXT-002 | explicit fragment markerからDeclaredKey identityを抽出する | explicit-fragments | heading変更variantでも同IDになる |
| IT-WM285-EXT-003 | markerなしlegacy fileをwhole-file Fragmentへfallbackする | legacy-whole-file | fileごとに一Fragmentになる |
| IT-WM285-EXT-004 | migration complete宣言後のmarker欠落を診断する | legacy-whole-file variant | fallbackせずdiagnosticになる |
| IT-WM285-EXT-005 | CRLF・CRをLFへ正規化しUnicodeを正規化しない | newline / NFC-NFD variants | 改行差は同digest、Unicode差は別digestになる |
| IT-WM285-EXT-006 | invalid UTF-8をreplacementなしで拒否する | invalid-utf8 | hard extraction diagnosticになる |
| IT-WM285-EXT-007 | symlinkをfollowせずlink target factとして抽出する | symlinks | target content nodeを増やさない |
| IT-WM285-EXT-008 | case-fold collisionを別pathのまま診断する | duplicate-identities | 暗黙mergeしない |
| IT-WM285-EXT-009 | duplicate DeclaredKeyでwinnerを選ばない | duplicate-identities | ambiguous diagnosticと不成立resultを返す |
| IT-WM285-EXT-010 | sourceとtest sourceをTestReference indexから分離する | minimal-valid + matrix DTO | 別artifact / edgeで接続する |

## 4. Provider facade / ACL integration tests

| ID | 日本語テストケース名 | Boundary | Assert |
|---|---|---|---|
| IT-WM285-ACL-001 | traceability plain DTOをowner identityのWorld nodeへ変換する | traceability public facade -> World adapter | provider domain objectなしでUnit / Story / AC / WorkItem factを得る |
| IT-WM285-ACL-002 | matrix DTOからStory・AC・TestReference indexを変換する | nyquist public facade -> World adapter | owner tupleとbindingを保持する |
| IT-WM285-ACL-003 | matrix generatedAtだけの差をprojection digestから除外する | matrix variants | 同digestになる |
| IT-WM285-ACL-004 | attestation raw signatureを除外しverification statusを保持する | attestation public facade -> World adapter | volatile差は同digest、status差は別digestになる |
| IT-WM285-ACL-005 | integrity targetとdigest declarationをWorld factへ変換する | ci-governance public facade -> World adapter | instruction corpus ownershipを変えない |
| IT-WM285-ACL-006 | owner DTOのunknown schemaをfail-closedにする | future-version DTO | generic field dropをせずdiagnostic / execution errorになる |
| IT-WM285-ACL-007 | world-modelからprovider内部へのdeep importを検出しない | import graph scan |許可public facade以外のimportが0件 |
| IT-WM285-HASH-001 | 公開SHA capabilityでknown bytesをhashする | attestation public capability -> WorldHashingPort | `sha256:<64 lowercase hex>`がknown valueと一致する |
| IT-WM285-HASH-002 | World導入後もnode:crypto SHA-256 call siteを増やさない | repository source scan | approved existing primitive以外が0件 |

## 5. Snapshot and constraint integration tests

| ID | 日本語テストケース名 | Fixture | Assert |
|---|---|---|---|
| IT-WM285-SNAP-001 | 複数extractorのfactを一つのSnapshotへ組み立てる | minimal-valid | stable node / edge countsとgolden corpusRootになる |
| IT-WM285-SNAP-002 | owner projectionとfilesystem列挙順を変えてもrootを維持する | order-shuffled variants | canonical bytes / corpusRootが一致する |
| IT-WM285-SNAP-003 | semantic content一件の変更だけをrootへ反映する | mutation pair | expected leaf digest / corpusRootが変わる |
| IT-WM285-SNAP-004 | absolute checkout rootとmtimeをrootから除外する | 2 temp checkout copies | corpusRootが一致する |
| IT-WM285-CON-001 | valid constraintsをadmitしてWCR findingなしで評価する | constraints-valid | constraintRoot / evaluationIdがgoldenと一致する |
| IT-WM285-CON-002 | malformed recordをWCR-001として隔離する | constraints-invalid |他WCRへ流さない |
| IT-WM285-CON-003 | endpoint削除をbaseline/current候補として報告する | mutation pair | WCR-003とChangeProvenanceを返す |
| IT-WM285-CON-004 | aliasなしrenameをremoved + addedとして報告する | rename pair | WCR-004にしない |
| IT-WM285-CON-005 | pin driftとcontent-equals driftをWCR-008にする | digest mutation pair |両endpoint ID / digestを保持する |

## 6. Declaration repository integration tests

| ID | 日本語テストケース名 | Repository | Assert |
|---|---|---|---|
| IT-WM285-REP-001 | constraints file不在をempty explicit setとして読む | constraints | implicit rulesは評価可能 |
| IT-WM285-REP-002 | baseline・waiver・debt file不在をcanonical empty inputにする | policy repositories | stable policyInputsDigestになる |
| IT-WM285-REP-003 | unknown schemaVersionをfail-closedにする | all repositories | empty fallbackせずexit分類2になる |
| IT-WM285-REP-004 | duplicate record ID・fingerprintでwinnerを選ばない | all repositories | ambiguity / malformed inputになる |
| IT-WM285-REP-005 | pin applyをtemp fileとatomic renameで保存する | constraints | complete JSONだけが残る |
| IT-WM285-REP-006 | pin write failureで元constraintsを保持する | failing filesystem | partial fileを正本にしない |
| IT-WM285-REP-007 | expired waiverをfixed as-of dateでblockingへ戻す | waivers | boundary date前後のclassificationが決定的になる |
| IT-WM285-REP-008 | baselineをclosed setとしてratchetする | baseline |返済削除は可、新規追加はblockingになる |
| IT-WM285-REP-009 | semantic debtとstructural obligationを別表示する | debts + WCR finding | categoryを混ぜない |

## 7. CLI end-to-end integration tests

testはtop-level dispatchに近いhandler/process境界を使い、stdout、stderr、exit code、filesystem diffを同時に検証する。

| ID | 日本語テストケース名 | Invocation | Exit / output / filesystem |
|---|---|---|---|
| IT-WM285-CLI-001 | valid corpusをhuman形式でinspectionする | `world:inspect` | exit 0、stdout summary、stderr空、writeなし |
| IT-WM285-CLI-002 | hard extraction diagnosticをinspection結果として返す | `world:inspect --json` | exit 1、stdoutに単一JSON envelope、writeなし |
| IT-WM285-CLI-003 | invalid configでtrustworthy inspectionを作らない | `world:inspect` | exit 2、human errorはstderr、writeなし |
| IT-WM285-CLI-004 | pin defaultをpreview-onlyにする | `world:pin ...` | exit 0、stdout diff、constraints bytes不変 |
| IT-WM285-CLI-005 | pin applyでconstraintsだけを更新する | `world:pin ... --apply` | exit 0、atomic update、他3 declaration / report不変 |
| IT-WM285-CLI-006 | ambiguous endpointのpin applyを拒否する | `world:pin ... --apply --json` | exit 1、stdout envelope、全file不変 |
| IT-WM285-CLI-007 | derive defaultをpure modeにする | `world:derive` | classificationに応じ0/1、report writeなし |
| IT-WM285-CLI-008 | derive writeを既定reportへ保存する | `world:derive --write` | resultに応じ0/1、`.harness/world-obligations.json`だけをatomic write |
| IT-WM285-CLI-009 | explicit outputへraw reportだけを保存する | `world:derive --write --out reports/world.json --json` | fileはCLI envelopeでなくraw report |
| IT-WM285-CLI-010 | out単独指定をusage errorにする | `world:derive --out reports/world.json` | exit 2、writeなし |
| IT-WM285-CLI-011 | unknown declaration schemaをfail-closedにする | `world:derive --json` | exit 2、expected JSON envelope、report不変 |
| IT-WM285-CLI-012 | report write failureを成功扱いしない | `world:derive --write` | exit 2、previous complete reportを保持 |
| IT-WM285-CLI-013 | conflicting format flagを拒否する | `--json --format human` | exit 2、writeなし |
| IT-WM285-CLI-014 | world.enabled falseでも明示commandを実行する | `world:inspect` | command自体はdisabled skipにならない |

exit code acceptance:

| Code | Integration meaning |
|---|---|
| 0 | command完了、blocking / hard diagnosticなし |
| 1 | trustworthy resultを返した上でdomain / structural / policy failureあり |
| 2 | invocation / config / schema / I/O / canonicalization / hashing failureでtrustworthy resultなし |

## 8. Determinism and mutation suite

| ID | 日本語テストケース名 | Mutation | Assert |
|---|---|---|---|
| IT-WM285-DET-001 | clean fixtureを同一processで2回deriveする | なし | canonical Snapshot / report bytes / roots / fingerprintsが一致する |
| IT-WM285-DET-002 | clean fixtureを別temp rootでderiveする | checkout pathのみ | semantic outputsが一致する |
| IT-WM285-DET-003 | filesystem・JSON array・object key順を入替える | orderのみ | semantic outputsが一致する |
| IT-WM285-DET-004 | LFとCRLFを入替える | newlineのみ | text semantic outputsが一致する |
| IT-WM285-DET-005 | explicit fragment contentを変更する | one semantic edit |対応leaf / root / fingerprintだけが変わる |
| IT-WM285-DET-006 | endpoint fileを削除する | delete | missing / deletion classificationがbaseline有無どおりになる |
| IT-WM285-DET-007 | endpoint fileをrenameする | move、aliasなし | removed + addedになりcontinuityを推論しない |
| IT-WM285-DET-008 | valid single-hop aliasを追加する | explicit alias | continuity factだけが追加される |
| IT-WM285-DET-009 | waiver expiry日を跨ぐ | policyAsOfDateのみ | corpusRoot不変、evaluationId / policy classificationが変わる |
| IT-WM285-DET-010 | persisted reportを改竄・削除する | generated reportのみ |次のderive result / root / exit codeが変わらない |

## 9. Test ownership and execution milestones

| Milestone | Integration focus |
|---|---|
| WM-06 | SHA public capability / no-new-crypto boundary |
| WM-08 | traceability facade contract |
| WM-09 | design corpus extractors |
| WM-10 | source / test / evidence / integrity extractors |
| WM-11 | Snapshot graph / inspect CLI |
| WM-12 | WCR evaluation |
| WM-13 | declaration repositories |
| WM-14 | fingerprint / obligation report |
| WM-15 | pin / derive CLI and atomic writes |
| WM-16 | full mutation / determinism E2E |
| WM-17 | clean self-repo double-run and adoption ratchet |

WM-05ではfixture / test sourceをまだ作成せず、各実装WIが本設計の該当caseを実装してからpass evidenceを記録する。

---

## 10. WI-286 provider contract checkpoint

<!-- @work-item-id WI-286 -->

@story-id H17-01

WM-06のintegration checkpointはattestation public rootからbytes hashing / UTF-8 helperを利用でき、既存attestation adapterと同値であること。World extractor / Snapshotとのintegration testはWM-07以降に行う。

public facade contract testはconsumerがattestation内部pathをimportしなくても完結し、repository source scanで新しいWorld側`node:crypto` call siteがないことを確認する。

## 11. WI-289 design corpus filesystem integration

<!-- @work-item-id WI-289 -->

@story-id H17-04

repository-shaped fixtureをtemporary rootへcopyし、product / inception / ADR / Unit extractorとtraceability public facadeを実filesystemで統合する。minimal valid corpus、same-bytes cross-role、duplicate DeclaredKey、malformed / orphan marker、missing reflection、symlink / unsupported fileを検証する。

同じfixtureを作成順・absolute temp root・LF / CRLFだけ変えて抽出し、canonical node / edge / diagnostic projectionが一致することを確認する。World sourceのprovider importはtraceability public `index.ts`だけ、SHA-256はattestation public capability経由、composition-root / indexはWM-11まで不変とする。

## 12. WI-290 runtime / evidence integration

<!-- @work-item-id WI-290 -->

@story-id H17-05

repository-shaped runtime fixtureでimplementation / test SourceFile、matrix、attestation、integrity manifestを同時抽出する。matrix reorder / generatedAt差、attestation volatile差、duplicate TestReference、unknown schema / field、optional file不在を検証する。

integrationはattestation public verify handlerとpublic SHA capabilityを接続し、nyquist public DTO contract以外のprovider deep import、world-modelの`node:crypto`、composition-root / index差分がないことを確認する。WM-10承認後のCP-1でfull suiteとWM-06〜10横断determinismを実行する。

## 13. WI-291 composition / inspect CLI integration

<!-- @work-item-id WI-291 -->

@story-id H17-06

WM-09 / 10 fixtureを全extractor、traceability public facade、attestation public SHA / verify capability、Snapshot assemblyへ接続する。configなしcanonical defaults、resolved existing path mapping、invalid config fail-closed、global duplicate / dangling edge diagnosticを検証する。

CLI E2Eはhuman / JSON、exit 0 / 1 / 2、single envelope、help / known-command conformance、実corpus counts / root、read-only filesystemを検証する。同じcheckoutで`world:inspect --json`を2回実行しbyte-identicalと`generatedAt`不在をassertする。full suiteとmatrix / L2 / L3 / integrityは着地後CP-2で実施する。

## WI-292 Matrix 1.2 integration

<!-- @work-item-id WI-292 -->

self-repo regenerated matrix 1.2をWorld compositionで読み、planned Storyを含むowner projectionとextractor v2 rootを決定的に構築する。generatedAtだけの差は引き続きrootへ入れない。
