# 統合テスト設計: attestation

@story-id H16-01
@story-id H16-02
@story-id H16-03

> **Unit ID**: attestation
> **作成日**: 2026-07-05（手3b / WI-227 で新規著述 — 手1 以来欠落していた readiness-doc 債務の返済）
> **対応ストーリー**: H16-01 / H16-02 / H16-03
> **インプット**: `domain_model.md`, `logical_design.md`, `unit_test_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`

> **honesty note**: 1〜3 章は attestation unit の**既存 integration テストを事後的に文書化**したもの、4 章は WI-227（H16-03）で追加する acBoundScope の round-trip / laundering / fail-closed ケースを設計する。

---

## 1. スコープと方針

- integration テストは attestation の **infrastructure adapter を実 I/O（実 fs / 実 subprocess）で駆動**し、round-trip（attest→verify）と改竄検知を e2e に近い粒度で検証する。
- domain 層のモックは禁止（testing-rules.md）。adapter テストは実ファイル・実 crypto・実 `main.ts` subprocess を用いる。
- 配置: `scripts/harness/__tests__/integration/attestation/`。

---

## 2. Adapter 統合テスト（既存）

### NodeCryptoContentHasherAdapter（`node-crypto-content-hasher-adapter.test.ts`）

| ケースID | 検証内容 |
|---------|---------|
| IT-HASH-001 | node:crypto の sha256 と一致する `sha256:<64hex>` を返す |
| IT-HASH-002 | 空文字の sha256 空ハッシュ値 |

### FileSystemSourceDigesterAdapter（`file-system-source-digester-adapter.test.ts`）

| ケースID | 検証内容 |
|---------|---------|
| IT-DIG-001 | ファイル内容の sha256 Digest |
| IT-DIG-002 | baseDir を無視して絶対パスの内容を hash |
| IT-DIG-003 | readFile 由来のエラーを throw（usecase が捕捉可能） |

### FileSystemAttestationRepositoryAdapter（`file-system-attestation-repository-adapter.test.ts`）

| ケースID | 検証内容 |
|---------|---------|
| IT-REPO-001 | 親ディレクトリ作成 + 2 スペース整形 JSON + 改行で書き出し |
| IT-REPO-002 | 書いた内容を parse 済み plain object として復元 |
| IT-REPO-003 | 書込エラーを throw（usecase が exit 2 に変換） |
| IT-REPO-004 | JSON.parse エラーを throw |

### CiCheckGateResultAdapter（`ci-check-gate-result-adapter.test.ts`）

| ケースID | 検証内容 |
|---------|---------|
| IT-GATE-001 | fake subprocess の pass 応答から allPassed / validatorResults を抽出 |
| IT-GATE-002 | fail 応答（allPassed:false）をエラーとせず抽出 |
| IT-GATE-003 | skipped 欠落を false に正規化 |
| IT-GATE-004 | **実 main.ts** の `phasegate:ci-check --json` 出力から allPassed と 1 件以上の validatorResults を抽出 |

---

## 3. attest→verify round-trip（既存 — `attest-verify-e2e.test.ts`）

| ケースID | 検証内容 |
|---------|---------|
| IT-E2E-001 | attest で record 生成 → verify が exit 0（全チェック合格） |
| IT-E2E-002 | granularity を改竄 → verify が mismatch を検出し exit 1（anti-laundering） |
| IT-E2E-003 | inputs.sources のファイルを改竄 → verify が inputHashes mismatch を検出し exit 1 |
| IT-E2E-004 | record 不在 → verify exit 2 |

---

## 4. WI-227（H16-03）追加 統合テストケース（`attest-verify-e2e.test.ts` へ追記）

| ケースID | Arrange | Act | Assert |
|---------|---------|-----|--------|
| IT-E2E-101 | HF2-05 が全 AC ac-bound な matrix + allowlist `["HF2-05"]` | attest → verify | 生成 record の `acBoundScope == ["HF2-05"]`、round-trip で保存、verify が再導出一致で exit 0。`granularity.traceability.level == "file"`（不変） |
| IT-E2E-102 | 上記 record の `acBoundScope` に bogus story を手で追加（再計算なし） | verify | acBoundScope 再導出不一致 → exit 1（laundering 検出） |
| IT-E2E-103 | matrix が HF2-05 の AC を fileFallbackOnly>0 に書き換えた状態 | verify（acBoundScope に HF2-05 を含む record を対象） | 再導出結果が `[]`（HF2-05 除外）となり格納値 `["HF2-05"]` と不一致 → exit 1 |
| IT-E2E-104 | 再導出に必要な matrix（`inputs.sources` のハッシュ検証済み入力）が読めない | verify | acBoundScopeOk=false → fail-closed（exit 1, Q2 準拠） |
| IT-E2E-105 | producedAt / gitCommit のみ異なる 2 回の attest | 双方の attestationDigest 比較 | バイト一致（acBoundScope 込みでも決定論、AC-8） |

> **Q3**: verify は matrix パスを `inputs.sources`（ハッシュ検証済み入力）から取得する。これにより verify 対象の matrix と produce 時点の matrix が同一であることが inputHashes チェックで担保され、acBoundScope 再導出が producer と同じ入力で行われる。
