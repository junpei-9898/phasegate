# テストカバレッジレポート: attestation

@story-id H16-01
@story-id H16-02
@story-id H16-03

> **Unit ID**: attestation
> **作成日**: 2026-07-05（手3b / WI-227 で新規著述）
> **フェーズ**: Phase 2（カバレッジ分析）
> **対応ストーリー**: H16-01（attest 生成）/ H16-02（verify 検証）/ H16-03（AC-bound scope）
> **インプット**:
> - `docs/product/construction/attestation/domain_model.md`
> - `docs/product/construction/attestation/logical_design.md`
> - `docs/product/construction/attestation/unit_test_design.md`
> - `docs/product/construction/attestation/it_test_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`

> **honesty note**: 本レポートは attestation unit が created された 手1（v0.165.0）以降ずっと欠落していた readiness-doc 債務の返済として WI-227 で新規著述した。数値は**実測値**であり fabricate していない（測定方法は §1 に明記）。

---

## 1. 測定方法（再現手順）

本レポートの数値は以下のコマンドで実測した（2026-07-05, vitest v3.2.4 / v8 coverage provider）:

```bash
npx vitest run \
  scripts/harness/__tests__/unit/attestation \
  scripts/harness/__tests__/integration/attestation \
  --coverage \
  --coverage.include='scripts/harness/attestation/**' \
  --coverage.reporter=text-summary
```

- **対象**: `scripts/harness/attestation/**`（domain / application / infrastructure / presentation の 4 層すべて）。
- **テストスコープ**: attestation の unit テスト（`__tests__/unit/attestation`）+ integration テスト（`__tests__/integration/attestation`）。
- 生成物（`.harness/attestation.json` 等）は対象外。
- WI-227 で追加した acBoundScope 関連テストを含めた再測定は、実装マージ後に同一コマンドで再取得すること（§4 参照）。

---

## 2. サマリー（実測 — 2026-07-05, acBoundScope 実装**前**の baseline）

| 指標 | 値 |
|------|-----|
| テストファイル数 | 15 |
| テストケース総数 | **83** |
| Statements | **83.53%**（827/990） |
| Branches | **78.08%**（228/292） |
| Functions | **97.75%**（87/89） |
| Lines | **83.53%**（827/990） |

### 判定結果

**総合判定: 合格（statements/lines 83.53%）**。testing-rules.md の推奨（90% 以上）に対し statements/lines は下回るが、これは infrastructure adapter の一部エラーパス（node:child_process の subprocess 失敗系、fs エラー系）が unit test では到達しづらいことに起因する。functions 97.75% が示すとおり、全公開 API は少なくとも 1 経路で実行されている。domain 層（entity / VO / service）は後述のとおり INV 網羅済み。

---

## 3. 層別カバレッジの内訳（設計対応）

| 層 | 主な対象 | テスト種別 | 状況 |
|----|---------|-----------|------|
| domain | `Digest` / `ValidatorOutcome` / `GranularityClaim` / `SignatureBlock` / `AttestationRecord`（canonical/determinism/equals）/ `GranularityDerivationService` | unit | INV-1〜INV-7 網羅（domain_model §5）。canonical JSON 直列化・inputDigest・attestationDigest の決定論を実測。 |
| application | `AttestationRecordMapper`（toDocument/fromDocument）/ `ProduceAttestationUseCase` / `VerifyAttestationUseCase` | unit | mapper の shape/型検証（MalformedAttestationError 経路）と両 usecase の主要分岐（require-pass fail / mode signed / 5 チェック）を網羅。 |
| infrastructure | `NodeCryptoContentHasherAdapter` / `FileSystemSourceDigesterAdapter` / `FileSystemAttestationRepositoryAdapter` / `CiCheckGateResultAdapter` | integration | 実 subprocess・実 fs を用いる。CiCheckGateResultAdapter は実 `main.ts` の `phasegate:ci-check --json` も回して抽出を確認。 |
| presentation | `AttestHandler` / `VerifyAttestationHandler` | unit | exit code（0/1/2）とフラグ解釈を検証。 |

---

## 4. WI-227（H16-03）で追加したカバレッジ

以下は本スライスで追加したテスト。マージ後の再測定で総ケース数・行カバレッジの増分を確定すること（§1 のコマンドで再取得）。

### domain

| 追加テスト | 対象 | 検証内容 |
|-----------|------|---------|
| `ac-bound-scope-service.test.ts` | `AcBoundScopeService.derive()` | allowlist ∩「全 AC が ac-bound」の story のみを昇順で返す / fileFallbackOnly を含む story を除外 / allowlist 外を無視 |
| `attestation-record.test.ts`（追記） | `AttestationRecord` | `acBoundScope` が `toCanonicalPayload()` / `equals()` / `create/reconstruct/seal` に反映される / producedAt・gitCommit のみ差異では attestationDigest がバイト一致（決定論） |

### application

| 追加テスト | 対象 | 検証内容 |
|-----------|------|---------|
| `produce-attestation-usecase.test.ts`（追記） | `ProduceAttestationUseCase` | matrixSource + allowlist から acBoundScope を導出し record に記録（HF2-05 スコープで `["HF2-05"]`） |
| `verify-attestation-usecase.test.ts`（追記） | `VerifyAttestationUseCase` | acBoundScope を stored matrix + allowlist から再導出し格納値と比較（laundering 検出）/ 再導出入力が読めない → fail-closed（exit 1） |
| `attestation-record-mapper.test.ts`（追記） | `AttestationRecordMapper` | acBoundScope の array-of-strings 検証（不正 shape → MalformedAttestationError） |

### integration

| 追加テスト | 対象 | 検証内容 |
|-----------|------|---------|
| `attest-verify-e2e.test.ts`（追記） | produce→verify round-trip | acBoundScope が round-trip で保存・再導出一致 / acBoundScope 改竄 → verify fail / matrix が HF2-05 に fileFallbackOnly>0 を示すとき HF2-05 含むスコープは verify fail |

---

## 5. 既知の限界（正直な記録）

- infrastructure の一部エラーパス（subprocess 異常終了、権限エラー等）は unit カバレッジに現れない。これは意図的な限界であり、fail-closed 挙動そのものは usecase 層のテストで担保している。
- branches 78.08% の主因は mapper の防御的型チェック分岐（各フィールドの `requireString`/`requireBoolean` の否定側）で、代表ケースのみを検証している。
