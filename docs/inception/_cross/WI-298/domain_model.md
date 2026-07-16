# WI-298 Domain Model: Adoption inventory

<!-- @work-item-id WI-298 -->

## MeasuredViolationInventory

同一ruleset / extractor / resolved config / matrixで導出した一意fingerprint集合を表す。各entryは`violationFingerprint`、`ruleId`、nullable `constraintId`を持ち、fingerprint順にsortする。集計dimensionはrule ID、corpus kind、owner Unitで、ExtractionDiagnostic、waiver、semantic debtを混ぜない。

## AdoptionBaseline

baselineはcandidate evaluationのidentityとrootをprovenanceとして持つexternal declarationである。current violationの保存stateではなく、same-rulesetのreview済みlegacy fingerprint closed setである。`repaid`は保存せずcurrentとの差分から導出する。

## SemanticDebtDeclaration

skill-quality coverage attestation gapは`pgw:v1:semantic-debt:skill-quality.coverage-attestation-legacy`として宣言する。これは人がimportした意味的負債であり、violationFingerprintを持たず、WCR obligationを抑止しない。

