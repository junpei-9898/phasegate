---
id: WI-286
type: story
severity: high
status: implemented
affects: [attestation, world-model]
source: internal
---

# WI-286: Unit非依存SHA-256 capability

<!-- @work-item-id WI-286 -->

@story-id H17-01
## 背景

ADR-033はWorld Modelがattestation内部の`ContentHasherPort`、`Digest`、infrastructure adapterをimportせず、plainなSHA-256 public capabilityを利用すると決定した。現行の`NodeCryptoContentHasherAdapter`は`node:crypto`のSHA-256 primitiveとattestation-local `Digest`変換を同じclassに持つため、別Unitから再利用できない。

WM-06ではprimitiveをattestation public facade配下へ移し、内部adapterをそのconsumerへ変更する。SHA-256実装のcall siteは増やさず、attestation既存挙動を維持する。

## スコープ

- `Sha256Capability.hashBytes(Uint8Array)`のplain public contract
- UTF-8 textを`TextEncoder`でbytesへ変換してcapabilityへ委譲する`hashUtf8` helper
- 既存`createHash("sha256")` primitiveのpublic capability implementationへの移動
- `NodeCryptoContentHasherAdapter`からattestation-local `Digest`へのanti-corruption変換
- attestation root barrel / composition-rootからのpublic factory公開
- known bytes、UTF-8、内部adapter同値性、公開境界、call-site不増加のtest
- attestation / world-model product constructionへのPhase 2反映

## スコープ外

- world-modelの`WorldHashingPort` source実装（WM-07以降）
- `FileSystemSourceDigesterAdapter`、ci-governance、installationの既存hash実装統合
- SHA-256以外のalgorithm選択
- attestation v2 / `worldSnapshotRoot`（WM-23）
- World canonical serializer / Snapshot（WM-07）

## 受け入れ基準

- public contractは`Uint8Array -> sha256:<64 lowercase hex>`のplain stringだけを返す。
- public barrelはattestation `Digest`、`ContentHasherPort`、concrete crypto classをexportしない。
- UTF-8 helperは`TextEncoder` bytesを`hashBytes`へ一度だけ委譲する。
- attestation内部adapterはpublic capabilityのplain digestをlocal `Digest`へ変換する。
- known bytesとnon-ASCII textが決定的な既知digestになる。
- 既存adapterのstring hashingとpublic helperが同値になる。
- `scripts/harness`内の`node:crypto` SHA-256 call-site数がWM-06導入前から増えない。
- attestation既存test、L1、L2、full suiteを実行し、環境起因の失敗は実装回帰と区別して報告する。

## 成果物

- `docs/inception/_cross/WI-286/{description,domain_model,logical_design,unit_test_design,it_test_design}.md`
- attestation / world-model construction設計への累積反映
- attestation public SHA-256 contract / factory / implementation / adapter更新
- unit / integration tests
- CHANGELOG / package version 0.240.0

## 依存と後続

- ADR-031のownership / consumer-owned adapter方針に従う。
- ADR-033 §8のattestation public facade裁定を執行する。
- H17-01 / WM-06の完了後、WM-07がWorld-local `WorldHashingPort`と`Sha256Digest`を実装できる。

## 実装結果

- `Sha256Capability` / `Sha256DigestString` / `hashUtf8`をattestation application public contractとして追加した。
- `createSha256Capability()`をroot barrelから公開し、concrete crypto classは非公開に保った。
- `createHash("sha256")` primitiveを既存content adapterから`NodeCryptoSha256Capability`へ移動した。
- `NodeCryptoContentHasherAdapter`はpublic capabilityをattestation-local `Digest`へ変換するadapterになり、引数なしconstructor互換も維持した。
- attestation record schema、domain `ContentHasherPort`、`Digest`、produce / verify use caseのsignatureを変更していない。
- source scanではproduction SHA-256 `node:crypto` call-site 5件、testを含む全occurrence 12件が実装前後で不変で、attestation内のprimitive pathだけが旧adapterから新capabilityへ移った。

## TDD / 検証結果

- RED: public module不存在とroot factory未公開により、対象2 test fileが期待どおり失敗した。
- GREEN / REFACTOR: 新規unit / integration 3 file、6 testがPASSした。
- attestation targeted: 19 test files / 104 tests PASS。sandboxの`tsx` IPC制約はrepository外temporary wrapperで`node --import tsx`へ等価起動した。
- L1: `phasegate:lint` PASS、changed sourceに対するBiome check PASS。
- L2: 7/7 PASS。既存skill-quality ungated-legacy warningのみ。
- TypeScript: repo-wide `tsc --noEmit`は既存`check-story-reflection-usecase.test.ts`の`storyTouchesUnitLayer`欠落1件でexit 2。WI-286 file由来のdiagnosticは0件。
- Full suite: `npm run test`を実行。fork configは3 files / 19 tests PASS。main configは574 files / 4323 tests PASS、16 files / 91 tests FAIL。失敗の大半はsandboxのtsx IPC `EPERM`でCLI subprocessが起動不能、残るcorpus test 1件はWI-281〜284の既存reflection baseline 24件で、WI-286 hashing test / attestation regressionの失敗は0件。
