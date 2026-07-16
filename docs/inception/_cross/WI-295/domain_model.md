# WI-295 Domain Model: Fingerprint and obligations

<!-- @work-item-id WI-295 -->

## ViolationFingerprintDerivation

`ConstraintFindingDto`を次のversioned semantic projectionへ変換し、canonical JSON bytesを`WorldHashingPort`でSHA-256化する。

```text
schemaVersion / rulesetVersion / ruleId / constraintId / factType
subject { endpointRole, sorted nodeIds }
claimantPin / premisePin
expected / observed
```

rule-owned expected / observed:

- WCR-001: well-formed declaration expectationとparse可能なdeclaration identity。human reason / locatorは除外
- WCR-002/003: endpoint pinとpresence expectation、current / baseline resolution observation
- WCR-004: single-hop alias expectationとdeclared target / resolution defect
- WCR-005: unique candidate expectationとcandidate count / sorted content digest multiset
- WCR-006/007: explicit directed relation expectationとrelation absence
- WCR-008: pinned digestまたはcontent equality expectationとobserved digest

## PolicyInputsDigest

`AdoptionBaseline | null`、sorted waiver、sorted semantic debt、resolved `policyAsOfDate | null`を`phasegate-world-policy-inputs/v1` projectionとしてhashする。waiver 0件ではdateを常にnullにし、waiverありではvalid UTC calendar dateを必須にする。

## Obligation classification

同一rulesetのbaseline集合を`B`、current fingerprint集合を`V`とする。

- `B ∩ V`: `adopted-legacy`
- `V − B`: `new-structural`
- `B − V`: `repaid` + `cleanup-required`
- WCR-001: `invalid-declaration`
- exact active waiver: `waived`
- expired waiver:元分類を維持し`expired-waiver` diagnostic

ruleset mismatch baselineは比較へ使用せず`baseline-ruleset-mismatch` diagnosticを返す。Worldはclassificationまでを所有し、blocking boolean / severity / exit codeを持たない。

## ObligationReport

immutable derived outputであり、次を持つ。

- `structuralObligations`
- `repaidBaselineEntries`
- `declaredSemanticDebts`
- `policyDiagnostics`
- 上記collectionから導出したsummary

全collectionはfingerprint / stable IDでsortする。`generatedAt`、report path、persisted repayment stateを持たない。
