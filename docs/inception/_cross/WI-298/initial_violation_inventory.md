# WI-298 Initial Structural Violation Inventory

<!-- @work-item-id WI-298 -->

## Measurement contract

- ruleset: `phasegate-world-wcr/v1`
- schema: `phasegate-world-snapshot/v1`
- extractor: `phasegate-world-extractor/v2`
- matrix: canonical generator output。`generatedAt`はprojectionから除外
- candidate policy: adoption baselineなし、waiverなし、explicit semantic debt 1件
- uniqueness key: `violationFingerprint`
- sort: fingerprint code point ascending

同一checkoutでbaselineなし`world:derive --json`を2回実行し、serialized bytesとfingerprint集合が一致した場合だけ採用する。root / candidate evaluation provenanceはcorpus外の`phasegate.world-baseline.json`に記録し、本inventory自身を含むcorpusとのself-referenceを作らない。

## Result

| Dimension | Key | Count |
|---|---|---:|
| total | unique structural fingerprints | 604 |
| ruleId | WCR-005 | 604 |
| corpus kind | generated TestReference index (`test-reference`) | 604 |

ExtractionDiagnostic 1034件、explicit semantic debt 1件、waiver 0件はstructural fingerprint総数に含めない。全604件はconstraint IDを持たないimplicit global ID uniqueness findingであり、WCR-001 / new claim / new pin / malformed policy inputは0件だった。

## Unit breakdown

Unitはtest sourceの`@unit`を優先し、legacy testにmetadataがない場合だけcanonical test path `scripts/harness/__tests__/<kind>/<unit>/...`のUnit segmentを使って帰属した。

| Unit | Count |
|---|---:|
| adr-foundation | 60 |
| agent-integration | 36 |
| attestation | 35 |
| biome-ast-engine | 68 |
| ci-governance | 20 |
| config-foundation | 80 |
| harness-api | 28 |
| harness-error | 38 |
| nyquist-validation | 5 |
| phase-dependency-model | 56 |
| quick-mode | 35 |
| skill-quality | 29 |
| traceability-model | 108 |
| validator-system | 6 |
| **Total** | **604** |

## Adoption decision

604件は全て同一rulesetのpre-existing WCR-005としてreviewし、WI-298のinitial closed baselineへ採用する。same-ruleset baselineへの将来追加は禁止し、返済はentry削除と再deriveで行う。semantic debtは`phasegate.world-debts.json`から別collectionへimportし、WCR-005の「再発見」や抑止とは表現しない。
