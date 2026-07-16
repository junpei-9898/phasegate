# WI-295 Logical Design: Derive obligations

<!-- @work-item-id WI-295 -->

## Application flow

```text
ConstraintEvaluationResult + roots/config/ruleset/date
  + baseline repository
  + waiver repository
  + semantic debt repository
    -> policy admission (invalid => fail-closed, no report)
    -> policyInputsDigest
    -> evaluationId
    -> finding fingerprints
    -> baseline set comparison / waiver classification
    -> immutable ObligationReport + canonical bytes
    -> optional ObligationReportWriterPort
```

`DeriveObligationsUseCase`は保存済みreportをreadするportを持たない。`writeReport=false`ではwriterを呼ばず、`true`でもpure derivation完了後の同じcanonical bytesだけをwriteする。write resultはpersistence statusとしてreport外へ返し、report classificationを変更しない。

## Layer placement

| Layer | Component |
|---|---|
| domain | fingerprint projection / hashing、policy digest、obligation classification |
| application | report DTO、derive orchestration、repository / writer ports |
| infrastructure | `.harness/world-obligations.json` atomic writer |
| composition | WM-13 repositories、hashing、serializer、root deriver、derive use caseの配線 |

presentation / CLIはWM-15まで変更しない。

## Invalid input contract

baseline / waiver / debt repositoryのいずれかが`invalid`なら、diagnosticをstable sortした`invalid-policy-input` resultを返す。empty declarationとしてdigest / evaluation ID / reportを作らない。absentだけをWM-13のcanonical emptyとして受理する。

## Persistence

writerはproject-relative `.harness/world-obligations.json`を既定pathとし、親directory作成、same-directory temporary file write、atomic renameを行う。write failureは既存complete reportを正本として保持し、application resultのpersistenceを`failed`にする。
