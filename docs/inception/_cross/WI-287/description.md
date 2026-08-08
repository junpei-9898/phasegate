---
id: WI-287
type: story
severity: high
status: tested
affects: [world-model]
source: internal
---

# WI-287: World domain primitives と canonical snapshot

<!-- @work-item-id WI-287 -->

@story-id H17-02
## 背景

ADR-032はWorld node identityを`pgw:v1` schema、PathKey、DeclaredKey、明示Fragment / legacy whole-fileの別形式として固定した。ADR-033はcanonical JSON、text normalization、`corpusRoot` / `constraintRoot` / `evaluationId`のpreimageと、consumer-owned hashing portを固定した。

WM-07では`scripts/harness/world-model/`の最初のsourceとして、これらのpure domain primitiveを実装する。filesystem、provider Unit、CLI、composition-rootには接続せず、同じsemantic inputからbyte-identicalなSnapshotを導出できる最小境界を作る。

## スコープ

- ADR-032全形式をparse / validate / serializeする`WorldNodeId`
- `PathKey`、`DeclaredKey`、`Sha256Digest`、`CorpusRole`、`ArtifactKind`
- `WorldNode`、`Edge`、`Snapshot`、`ExtractionDiagnostic`
- recursive key sort / ordered array保持 / unsupported JSON value拒否を行うcanonical serializer
- strict UTF-8 decode、CRLF / CR → LFだけを行うtext normalizer
- node / edge / diagnostic setをstable sortする`corpusRoot`導出
- plain canonical declaration projectionを受ける`constraintRoot`と、six-field preimageからの`evaluationId`導出境界
- consumer-owned`WorldHashingPort`
- identity、canonicalization、normalization、three roots、determinismのunit test

## スコープ外

- filesystem traversal、symlink read、Markdown / source / generated artifact extractor
- owner-aware matrix / attestation / integrity projection
- traceability-model read facade / anti-corruption adapter
- ConstraintRecord / WCR evaluation / baseline / waiver / obligation
- attestation public SHA capabilityへ接続するinfrastructure adapter
- application use case、public facade、`index.ts`、composition-root、CLI

## 受け入れ基準

- ADR-032の全World node ID形式をvalid tupleから生成し、同じ文字列へround-trip parseできる。
- invalid path、DeclaredKey、digest、kind / role combination、non-canonical percent encodingをfail-closedで拒否する。
- explicit Fragment IDにpath、heading、line、digestを含めない。
- canonical serializerはobject key順に依存せず、array順を保持し、`undefined`、sparse array、非finite number、bigint等を拒否する。
- text normalizerはLF / CRLF / lone CRを同じbytesにし、Unicode normalization、BOM / whitespace / final newline除去を行わない。
- Snapshot root preimageはschema / extractor version、corpus config digest、sorted nodes / edges / diagnosticsだけを含み、derived root自身を含めない。
-同じinputを2回、またはset列挙順 / object key順 / LF-CRLFを変えて導出してもcanonical bytesとrootが一致する。
- domain sourceは`node:crypto`、filesystem、他Unit型をimportしない。

## 成果物

- `docs/inception/_cross/WI-287/{description,domain_model,logical_design,unit_test_design}.md`
- world-model product constructionのdomain / logical / unit test設計への累積反映
- `scripts/harness/world-model/domain/{value-objects,entities,services,ports}/**`
- world-model domain unit tests
- CHANGELOG / package version 0.242.0

## 依存と後続

- ADR-031〜033、H17-02、WM-05/06の公開境界を前提とする。
- WM-08〜10がowner DTO / corpus bytesをWorld-local primitiveへ変換する。
- WM-11がapplication use case、public facade、composition-rootと`world:inspect`へ接続する。

## 実装結果

- world-model初sourceとしてdomain 15 file（VO 7、Entity 4、Service 3、Port 1）を追加した。
- `WorldNodeId`はADR-032の9 external形式をtype別factory / parserでround-tripし、non-canonical percent encodingとkind / role不整合を拒否する。
- canonical serializerはrecursive key sort、ordered array、strict JSON data modelを実装し、set orderはroot deriverでADR tuple順へcopy-sortする。
- text normalizerはfatal UTF-8 decode、CRLF / CR → LFだけを実装し、BOM / Unicode / whitespace / final newlineを保持する。
- Snapshotはcanonical corpus bytes、corpusRoot、Snapshot IDを保持し、constraintRoot / evaluationIdを関連づけてもcorpus identityを変更しない。
- `SnapshotRootDeriver`はcorpus / constraint / evaluationのpreimageを分離し、test-local deterministic `WorldHashingPort`でhash input bytesを検証できる。
- filesystem、`node:crypto`、provider Unit import、application / infrastructure / presentation、`index.ts`、composition-rootは追加していない。
- I/Oを持たないpure domain sliceのため`it_test_design.md`は作成していない。

## TDD / 検証結果

- RED: world-model module不存在により6 test suitesが期待どおりfailした。
- GREEN / REFACTOR: world-model domain unit 6 files / 58 tests PASS。
- Biome: 新規world-model source / tests 21 files PASS。
- L1: `phasegate:lint` PASS。
- L2: 7/7 PASS。既存skill-quality ungated-legacy warningのみ。
- check-ready: 88/88 Story PASS、H17-02 missing phaseなし。
- TypeScript: repo-wide `tsc --noEmit`は既存`check-story-reflection-usecase.test.ts`の`storyTouchesUnitLayer`欠落1件でexit 2。world-model / WI-287由来diagnosticは0件。
- full suiteは指示どおりCP-1（WM-08着地後）まで実行していない。
