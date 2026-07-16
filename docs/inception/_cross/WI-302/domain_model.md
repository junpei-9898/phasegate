# WI-302 Domain Model: Authoritative World re-derivation policy

<!-- @work-item-id WI-302 -->

## WorldConstraintRederivationObservation

World public facadeから受けるplain observationであり、WorldのEntity / VOを公開しない。structural obligationは`ruleId`、`violationFingerprint`、`constraintId`、`classification`を保持し、derive不能時はpath付きdiagnosticをlosslessに保持する。

## WorldConstraintRederivationService

validator-system所有のpure domain service。observationをauthoritative L3 findingへ写像する。

| World observation | L3 severity | Blocking intent |
|---|---|---|
| `new-structural` | error | blocking |
| `invalid-declaration` | error | blocking / non-adoptable |
| derive diagnostic | error | authoritative判定不能のためfail-closed |
| `adopted-legacy` | warning | visible、non-blocking by default |
| `waived` | warning | visible、non-blocking |

## Invariants

- `violationFingerprint`はviolation identity、`constraintId`はdeclaration identityとして混同しない。
- error / warningは`ruleId`、fingerprint、path、classificationの順で決定的に並べる。
- finding messageは`L3 authoritative clean-corpus re-derivation`であることを明記する。
- blocking policyはvalidator-systemが所有し、world-modelのevaluation DTOへseverity / exit codeを持ち込まない。
- 保存reportはdomain inputでもadapter inputでもない。
