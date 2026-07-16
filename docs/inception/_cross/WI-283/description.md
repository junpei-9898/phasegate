---
id: WI-283
type: story
severity: high
status: drafted
affects: [world-model, attestation, ci-governance, nyquist-validation, config-foundation]
source: internal
---

# WI-283: World snapshot canonicalization と version roots の確立

<!-- @work-item-id WI-283 -->

## 背景

World Model が同じ checkout から同じ snapshot / obligation を再導出するには、filesystem列挙順、JSON key順、absolute root、clock、line endingなどの実行環境差をrootから排除しなければならない。一方、extractor / ruleset / schema / relevant configの変更は、同じcorpus contentでも解釈が変わるためrootへ明示的に反映する必要がある。

現行実装には、attestationのrecursive key sort canonical JSON、matrixの`generatedAt`付きpretty JSON、attestation / integrityのraw-byte SHA-256という異なるdigest慣行がある。本WIはそれらを無理に同一domain modelへ統合せず、World固有のcanonicalizationとconsumer-owned hashing portを決定する。

## スコープ

- `corpusRoot`, `constraintRoot`, `evaluationId`のpreimageと除外項目
- World leaf content digestとcanonical JSON byte contract
- object key / array / set-valued collectionのorder
- project-relative path、filesystem order、symlink、case sensitivity
- raw bytes / UTF-8 / LF・CRLF / Unicode normalization
- `generatedAt`、absolute path、report、self root、deployment version stampの除外
- `schemaVersion`, `extractorVersion`, `rulesetVersion`, relevant config digestの包含
- SHA-256 public capabilityとworld-model consumer-owned portの境界

## スコープ外

- node / fragment identityとlocator（ADR-032で確定済み）
- constraint rule、fingerprint、blocking、baseline、waiverの意味論（ADR-034〜035）
- declaration filename、CLI、report output、config key（ADR-037）
- attestation v2のschemaVersion / predicateType（WM-23）
- source / parser / hashing adapterの実装（WM-06以降）

## 受け入れ基準

- 三つのroot / IDのpreimageが相互参照なく定義されている。
- 同じ論理入力はfilesystem order、object key order、absolute root、LF / CRLF差に依存せずbyte-identicalになる。
- ordered arrayとset-valued collectionの扱いが分離されている。
- proseのUnicode code pointをNFC / NFDへ正規化しない方針が明記されている。
- symlinkをfollowせず、case-fold collisionをmergeしない。
- matrix `generatedAt`などowner既知のvolatile fieldをschema projectionで除外し、名前一致のgeneric field dropを行わない。
- versionsとrelevant resolved configだけがrootへ入る。
- world-modelがattestation内部Port / Digest / infrastructure classをimportせず、`node:crypto`呼び出しを増やさない。

## 成果物

- `docs/inception/_cross/WI-283/description.md`
- `docs/inception/_cross/WI-283/domain_model.md`
- `docs/inception/_cross/WI-283/logical_design.md`
- `docs/inception/_cross/WI-283/unit_test_design.md`
- `docs/ADR/033-world-snapshot-canonicalization.md`

## 依存と後続

- ADR-031のartifact kind / corpus role / ownershipを前提とする。
- ADR-032の`pgw:v1` ID、PathKey、legacy fragment migrationを前提とする。
- ADR-033承認後、WM-04がconstraint / baseline / CLIの詳細を決定できる。
- hashing capabilityの実装はWM-06、World domain primitive / serializerはWM-07が担当する。
