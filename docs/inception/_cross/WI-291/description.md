---
id: WI-291
type: story
severity: high
status: drafted
affects: [world-model, harness-api]
source: internal
---

# WI-291: World graph assembly と `world:inspect`

<!-- @work-item-id WI-291 -->

@story-id H17-06

## 背景

WM-07は決定的Snapshot root、WM-08〜10はprovider ownershipを保ったfact extractorを提供した。CP-1で個別extractorの決定性とlossless diagnosticは確認済みだが、全factを一つのgraphへ統合して利用者が観測するpublic application / CLI surfaceはまだない。

WM-11では全extractorをglobal no-winner規則で組み立て、read-only `world:inspect`としてcorpus inventory、stable node ID、edge、diagnostic、`corpusRoot`を表示する。これは可視化マイルストーンであり、constraint / obligation MVPではない。

## スコープ

- `BuildSnapshotUseCase`: 全extractor resultの統合、global node / edge dedup、dangling edge diagnostic、Snapshot導出
- `InspectWorldUseCase`: Snapshotからplain deterministic inspection DTOを導出
- attestation public SHA-256 capabilityからconsumer-owned `WorldHashingPort`へのadapter
- world-model `composition-root.ts` / `index.ts`
- `world:inspect` handlerのhuman / JSON output、exit 0 / 1 / 2
- config不在時のADR-037 canonical defaults
- config存在時のconfig-foundation `LoadResolvedConfigUseCase`経由の解決済みplain input
- main dispatch / help、`KNOWN_HARNESS_COMMANDS`、conformance / CLI E2E

## スコープ外

- `world:pin` / `world:derive`、constraint / baseline / waiver / obligation（WM-12〜15）
- top-level `world` config schema / preset / mapper（WM-18）
- validator-system登録、blocking policy（WM-19 / 20）
- extractor owner projectionの意味変更
- report / declaration / corpus fileへのwrite

## 受け入れ基準

- 全extractorを同じproject rootとresolved path inputで実行し、global duplicate node IDにwinnerを選ばない。
- admitted nodeを参照できないedgeはgraphへ入れず、endpointをlossless diagnosticへ残す。
- Snapshotは`phasegate-world-snapshot/v1`、`phasegate-world-extractor/v1`、semantic corpus config digestをpreimageに含む。
- `world:inspect --json`は単一`phasegate-world-cli/v1` envelopeをstdoutへ返し、`generatedAt`、absolute root、mtimeを含めない。
- `not-present`だけならexit 0、他のhard extraction diagnosticがあればtrustworthy resultをexit 1で返す。
- invalid invocation / resolved config / extraction failureでSnapshotを作れない場合はexit 2。
- human / JSONともread-onlyで、同一checkoutのJSON出力を2回実行してbyte-identicalにする。
- main dispatch、help、known command定数、conformance testを同一着地点で同期する。

## 成果物

- `docs/inception/_cross/WI-291/{description,domain_model,logical_design,unit_test_design,it_test_design}.md`
- world-model / harness-api construction 4文書への累積反映
- world-model application use case / DTO / port
- world-model hashing adapter、composition root、public index、presentation handler
- CLI conformance / unit / integration / E2E test
- CHANGELOG / package version 0.246.0

## 後続

- WM-11承認後にCP-2としてfull suite、matrix再生成、L2 / L3、integrity verifyを実施する。
- WM-12以降が同じSnapshotをconstraint evaluationへ接続する。
