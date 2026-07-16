# WI-294 Domain Model: World control declarations

<!-- @work-item-id WI-294 -->

## External declaration models

### AdoptionBaseline

同一`rulesetVersion`のclosed fingerprint setを表すimmutable external declaration。`sourceEvaluationId`、`sourceCorpusRoot`、`sourceConstraintRoot`、採用WI、理由とsorted entryを保持する。返済状態を保存せず、新規entry追加の可否も本Entityでは判断しない。

### WorldWaiver

exact `violationFingerprint`への期限付きreview済み例外。`waiverId`、理由、exclusive expiry、WI、optional `renewalOf`を保持する。expiry / applicability判断はWM-14へ残す。

### SemanticDebtDeclaration

`semantic` kind、明示`debtId`、title / reason / owner Unit / introduced WI、sorted World node referenceを保持する。WCR由来structural obligationとは別categoryである。

## Value semantics

- `ViolationFingerprint`: `pgw:v1:violation-fingerprint:sha256:<64 lowercase hex>`
- `WaiverId`: `pgw:v1:waiver:<DeclaredKey>`
- `SemanticDebtId`: `pgw:v1:semantic-debt:<DeclaredKey>`
- `WorkItemId`: `WI-\d+`
- `expiresOn`: valid `YYYY-MM-DD` calendar date。comparison policyは持たない

## Constraint admission

supported constraints envelopeの各recordを独立にadmitする。valid recordは`ConstraintRecord`と、fact typeに応じた`ExplicitConstraintRelation`へ変換する。malformed recordとduplicate constraint ID candidateは`MalformedConstraintDeclaration`へ変換し、WCR-001以外へ流さない。alias declarationもsingle-hop `ExplicitNodeAlias`へ変換し、duplicate sourceはwinnerを持たない。

## Invariants

1. schemaVersionは各external declarationのversioned contractとexact一致する。
2. unsupported documentとsupported envelope内のmalformed recordを区別する。
3. duplicate identity / fingerprintから任意candidateを採用しない。
4. set-valued arrayはcopy-sortし、input順序をidentityにしない。
5. ci-governance baselineのpath / SHA-1 identityをWorld baselineへ暗黙変換しない。
