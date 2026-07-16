---
id: WI-290
type: story
severity: high
status: drafted
affects: [world-model]
source: internal
---

# WI-290: Runtime / generated evidence extractor

<!-- @work-item-id WI-290 -->

@story-id H17-05

## 背景

WM-07はSourceFile / TestReference / generated artifactを表現できるWorld IDとcanonicalizationを提供し、WM-09はdesign corpus extractorのfilesystem / diagnostic慣行を確立した。ADR-031はmatrix、attestation、integrityのownerを分離し、ADR-033は各owner向けのvolatile-field除外とsemantic projectionを決定した。

WM-10ではsource / test source、matrix、attestation、integrity manifestをprovider ownershipを保ったWorld factへ変換し、Phase Aのextractor contractを完成する。

## スコープ

- implementation sourceとtest sourceを区別するSourceFile fact extractor
- `// @unit`、`// @layer`、`// @work-item-id` metadata projection
- matrix public DTO契約に基づくStory / AC / TestReference projection
- matrix `generatedAt`除外、owner tuple sort、duplicate TestReference no-winner
- attestation public DTO / verify handler ACL、verification status包含
- attestation `producedAt`、producer、gitCommit、signature / self digest除外
- integrity manifest path / raw digest declaration projection
- optional provider fileの`not-present` observation
- unsupported schema / field、parse / I/O failureのExtractionDiagnostic
- fixture-based unit / integration test

## スコープ外

- attestation / nyquist-validation / ci-governance source変更
- design corpus extractor変更（WM-09）
- Snapshot assembly / corpusRoot use case / composition-root / index / CLI（WM-11）
- matrix生成、attestation生成、integrity pin / verifyのowner behavior変更
- source metadataからStory / AC / TestReference semanticsを推論すること

## 受け入れ基準

- `scripts/harness/**/*.ts`をimplementation / test SourceFileへ一度だけ分類し、absolute rootやmtimeをfactへ入れない。
- matrix projectionは`generatedAt`だけの差でdigestが変わらず、Story / AC / TestReference tupleをowner ID順に並べる。
- TestReference node IDはADR-032 tupleから生成し、duplicate tupleにwinnerを選ばない。
- attestation projectionはpublic contractだけを使い、volatile metadata / signatureを除外してverification statusを含める。
- integrity manifestのpath / raw SHA-256 declarationを観測するが、target bytesのowner digest contractを変更しない。
- optional file不在はempty successにせず`not-present` diagnostic、存在するinvalid fileはhard extraction diagnosticにする。
- provider内部path、`node:crypto`、composition-root / index.tsを追加・変更しない。

## 成果物

- `docs/inception/_cross/WI-290/{description,domain_model,logical_design,unit_test_design,it_test_design}.md`
- world-model construction 4文書への累積反映
- `scripts/harness/world-model/infrastructure/adapters/{source-metadata,test-reference-source,matrix,attestation,integrity-manifest}-fact-extractor.ts`
- shared runtime / JSON extraction support
- matrix / attestation / integrity / source fixtureとunit / integration test
- CHANGELOG / package version 0.245.0

## 依存と後続

- ADR-031〜033 / 037、H17-05、WM-06 / 07 / 09の公開境界を前提とする。
- WM-11がWM-09 / 10の全extractorをgraph / Snapshotへ組み立てる。
- WM-10承認後にCP-1としてPhase A contractのfull suite / determinism検証を行う。
