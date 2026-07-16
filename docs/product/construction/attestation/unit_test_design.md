# ユニットテスト設計: attestation

@story-id H16-01
@story-id H16-02
@story-id H16-03

> **Unit ID**: attestation
> **作成日**: 2026-07-05（手3b / WI-227 で新規著述 — 手1 以来欠落していた readiness-doc 債務の返済）
> **対応ストーリー**: H16-01（attest 生成）/ H16-02（verify 検証）/ H16-03（AC-bound scope）
> **インプット**: `domain_model.md`, `logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`

> **honesty note**: 本ドキュメントは attestation unit の**既存テストを事後的に文書化**したもの（1〜4 章）に加え、WI-227（H16-03）で追加する **acBoundScope 関連テスト**（5 章）を設計する。既存テストの記載は実ファイルのテストケース名に対応する（fabricate なし）。

---

## 1. 対象ドメインモデル（domain_model.md 準拠）

- 集約: `AttestationRecord`（attestation ドキュメント 1 件を整合性境界とする単一集約）
- 値オブジェクト: `Digest`, `ValidatorOutcome`, `GranularityClaim`, `SignatureBlock`
- ドメインサービス: `GranularityDerivationService`（純粋・決定論的・全域）、`AcBoundScopeService`（**WI-227 新規**・純粋）
- domain port: `ContentHasherPort`（INV-4/INV-5 の digest 算出）

---

## 2. 値オブジェクト テストケース（既存）

### Digest（`digest.test.ts`）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-DIG-001 | `sha256:<64hex>` | value 保持 |
| UT-DIG-002〜004 | 不正 prefix / 長さ / 大文字 hex | `InvalidDigestError` |
| UT-DIG-005 | 生 hex → `sha256:` 付与 | prefix 付き Digest |
| UT-DIG-006 | 例外 | errorCode `L1-050` を保持 |
| UT-DIG-007/008 | 同一/異なる value | equals=true/false |

### ValidatorOutcome（`validator-outcome.test.ts`）

| ケースID | 内容 | 期待結果 |
|---------|------|---------|
| UT-VO-001 | 正常生成 | 各属性保持 |
| UT-VO-002 | skipped 未指定 | false へ正規化 |
| UT-VO-003 | isGreen 判定 | passed / (passed=false ∧ skipped) → green、両 false → not green |
| UT-VO-004 | 等値性 | 全属性一致で equals=true |

### GranularityClaim / SignatureBlock（`signature-block.test.ts`）

| ケースID | 内容 | 期待結果 |
|---------|------|---------|
| UT-SIG-001 | `unsignedPoc()` | mode=unsigned-poc, algorithm/keyId/value=null（AC-8） |
| UT-SIG-002 | 非対応 mode / null 三点組違反 | `UnsupportedSignatureModeError`（AC-12 / INV-6） |
| UT-SIG-003 | 例外 | errorCode `L1-052` |
| UT-SIG-004 | 等値性 | mode+digest 一致で equals=true |

---

## 3. 集約 `AttestationRecord` テストケース（既存 — `attestation-record.test.ts`）

| ケースID | INV | 検証内容 |
|---------|-----|---------|
| UT-AR-001 | INV-1 | gateResult と validatorSet allPassed 規則の不一致で `AttestationInvariantError`（AC-3） |
| UT-AR-002 | INV-3 | granularity が導出値と不一致で `AttestationInvariantError`（anti-laundering） |
| UT-AR-003 | INV-6 | unsigned-poc の null 三点組違反は SignatureBlock 段階で拒否 |
| UT-AR-004 | INV-4 | `toCanonicalPayload()` は signature と volatile metadata（producedAt/gitCommit）を除去（AC-9） |
| UT-AR-005 | — | `canonicalStringify` はキー昇順ソート・空白なし・配列順序保持 |
| UT-AR-006 | INV-4 | seal 決定論: producedAt が違っても attestationDigest 一致（AC-9） |
| UT-AR-007 | INV-4 | seal 後 attestationDigest == canonical payload の sha256 |
| UT-AR-008 | INV-5 | computeInputDigest: sources 順序が違っても inputDigest 一致（AC-5 決定論） |

## 4. ドメインサービス / mapper / usecase テストケース（既存）

### GranularityDerivationService（`granularity-derivation-service.test.ts`）— **WI-227 では UNTOUCHED**

| ケースID | 検証内容 |
|---------|---------|
| UT-GDS-001 | L3-004 present → level="file" と file-level known-limitation を導出（AC-6/AC-7） |
| UT-GDS-002 | L3-004 absent → known-limitation なしの not-run 主張 |
| UT-GDS-003 | 決定論的に等値な GranularityClaim を返す |
| UT-GDS-004 | validatorSet から L3-004 を除去すると導出値が変化（改竄検出基盤） |

> **重要**: acBoundScope は `granularity.traceability.level` とは独立の**別フィールド**であり、`GranularityDerivationService` は H16-03 でも一切変更しない（level は "file" のまま）。

### AttestationRecordMapper / Produce / Verify usecase（既存）

`attestation-record-mapper.test.ts` / `produce-attestation-usecase.test.ts` / `verify-attestation-usecase.test.ts` に AC-1〜AC-13（H16-01）と AC-1〜AC-9（H16-02）の分岐が対応する（require-pass fail → exit1 / mode signed → exit2 / 5 チェックの各 mismatch → exit1 / read・parse・shape 失敗 → exit2）。

---

## 5. WI-227（H16-03）追加 ユニットテストケース

### 5.1 AcBoundScopeService（domain・新規 `ac-bound-scope-service.test.ts`）

| ケースID | Arrange | Act | Assert |
|---------|---------|-----|--------|
| UT-ABS-001 | 全 AC が ac-bound な story `HF2-05` を含む matrix + allowlist `["HF2-05"]` | `derive(matrix, allowlist)` | `["HF2-05"]`（昇順） |
| UT-ABS-002 | ある AC が fileFallbackOnly な story を含む matrix | `derive` | その story を除外して返す |
| UT-ABS-003 | allowlist 外の story も全 AC ac-bound な matrix | `derive` | allowlist 外は無視され返り値に含まれない |
| UT-ABS-004 | 複数の該当 story（順不同） | `derive` | 返り値は昇順ソート |

> 資格条件（domain_model INV-8）: story が返り値に含まれる ⟺ allowlist に含まれ **かつ** その story の全 linked AC が ≥1 の `binding:"ac"` ref を持つ（fileFallbackOnly===0）。

### 5.2 AttestationRecord acBoundScope 反映（既存ファイルへ追記）

| ケースID | 検証内容 |
|---------|---------|
| UT-AR-101 | `acBoundScope` が `toCanonicalPayload()` に含まれる（attestationDigest でカバーされる） |
| UT-AR-102 | `acBoundScope` が `equals()` の比較対象に含まれる |
| UT-AR-103 | `create()/reconstruct()/seal()` で acBoundScope が保持される。granularity は untouched（level="file"） |
| UT-AR-104 | producedAt / gitCommit のみ差異 → attestationDigest がバイト一致（acBoundScope 込みでも決定論） |

### 5.3 AttestationRecordMapper acBoundScope（既存ファイルへ追記）

| ケースID | 検証内容 |
|---------|---------|
| UT-ARM-101 | toDocument が acBoundScope を出力、fromDocument が復元 |
| UT-ARM-102 | acBoundScope が array-of-strings でない → `MalformedAttestationError`（L1-053） |

### 5.4 Produce / Verify usecase acBoundScope（既存ファイルへ追記）

| ケースID | 検証内容 |
|---------|---------|
| UT-PU-101 | matrixSource + allowlist + AcBoundScopeService で acBoundScope を導出し record に記録（HF2-05 スコープで `["HF2-05"]`） |
| UT-VU-101 | verify が stored matrix + allowlist から acBoundScope を再導出し格納値と比較 → 一致で pass |
| UT-VU-102 | acBoundScope 改竄（bogus story 追加）→ 再導出不一致 → fail（exit 1, laundering 検出） |
| UT-VU-103 | 再導出入力（matrix / allowlist）が読めない → acBoundScopeOk=false → fail-closed（exit 1, Q2） |

---

## 6. WI-286 SHA-256 facade unit tests

<!-- @work-item-id WI-286 -->

@story-id H17-01

| Case ID | 日本語テストケース名 | Test boundary |
|---|---|---|
| UT-WM286-001 | non-ASCII文字列をTextEncoderのUTF-8 bytesへ変換する | `hashUtf8` + fake public capability |
| UT-WM286-002 | capabilityのplain digestを変更せず返す | `hashUtf8` |
| UT-WM286-003 | plain digestをattestation-local Digestへ変換する | `NodeCryptoContentHasherAdapter` |
| UT-WM286-004 | stringをUTF-8 helper経由で一度だけhashする | adapter + fake capability spy |

AAAを明示し、domain objectをmockしない。doubleはapplication public portだけに限定する。
