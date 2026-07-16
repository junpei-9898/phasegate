# WI-301 Domain Model: World constraint admission policy

<!-- @work-item-id WI-301 -->

## WorldConstraintAdmissionObservation

world-model public facadeから受けるplain observation。structural obligationの`ruleId`、`violationFingerprint`、`constraintId`、`classification`と、derive不能時のdiagnosticを保持する。validator-systemのdomainへWorld Entity / VO / repository resultを持ち込まない。

## WorldConstraintAdmissionService

validator-system所有のpure domain service。observationをL2 findingへ写像する。

| World observation | L2 severity | Blocking intent |
|---|---|---|
| `new-structural` | error | blocking |
| `invalid-declaration` / constraint input diagnostic | error | blocking / non-adoptable |
| `adopted-legacy` | warning | visible、non-blocking by default |
| `waived` | warning | visible、non-blocking |
| non-constraint execution diagnostic | warning | L2ではauthoritative判断不能 |

`repaid` cleanup、baseline migration、expired waiver等のauthoritative policyはL3-008へ残す。L2-017は保存reportを読まずpure derive observationだけを使う。

## Invariants

- findingは`ruleId`、fingerprint、classificationの決定的順序で返す。
- error / warningのどちらもlocal fast-pathであることをmessage / suggestionに明記する。
- validなnew claim / pinがfindingを生まなければpassする。追加自体をblockしない。
- adopted baseline fingerprintをerrorへ昇格しない。
