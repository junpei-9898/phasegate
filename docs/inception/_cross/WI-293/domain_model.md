# WI-293 Domain Model: World constraints

<!-- @work-item-id WI-293 -->

## Entities

### ConstraintRecord

`constraintId`、`schemaVersion`、directed `factType`、claimant / premise `NodePin`、sorted non-empty `applicableRuleIds`、declaration artifact / locatorを保持するimmutable Entity。pinやprovenanceを評価時に更新しない。

malformed declarationは`ConstraintRecord`ではない。`MalformedConstraintDeclaration`としてadmission reasonとdeclaration provenanceだけを保持し、WCR-001へ変換する。

## Value Objects

- `NodePin`: stable `WorldNodeId` + expected `Sha256Digest`
- `WcrRuleId`: `WCR-001`〜`WCR-008`
- `ConstraintFactType`: `references | depends-on | refines | content-equals`
- `ChangeProvenance`: baseline/current Snapshot identityとsorted changed candidates。因果を表さない
- `ExplicitNodeAlias`: old IDからtarget IDへのsingle-hop declaration
- `ExplicitConstraintRelation`: constraint declaration由来のdirected fact evidence

## Domain Service

`ConstraintEvaluator`はcurrent / optional baseline Snapshot、records、malformed declarations、aliases、explicit relations、ChangeProvenanceからstable sorted findingを返す。findingはrule / constraint / endpoint resolution / expected-observed evidenceを持つがpolicy fieldを持たない。

endpoint resolution precedence:

1. malformed declaration: WCR-001、recordなし
2. exact / alias target duplicate: WCR-005
3. exact current candidate一件: resolved
4. explicit alias: validならresolved-via-alias、不正ならWCR-004
5. baseline exact candidateあり: WCR-003
6. その他: WCR-002

unresolved endpointではreference / dependency / digest ruleを評価しない。同じendpointへWCR-002とWCR-003を同時に返さない。
