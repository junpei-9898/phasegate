# WI-297 Domain Model: Mutation evidence

<!-- @work-item-id WI-297 -->

## Comparison input

`DeriveWorldObligationsUseCase`はoptional `baselineSnapshot`とcurrent Snapshotを別入力として扱う。baselineはChangeProvenanceとWCR-003判定にだけ使い、adoption baseline、constraintRoot、violationFingerprint、blocking stateへ変換しない。省略時はinitial evaluationである。

## Scenario observation

fixture observationは次を保持する。

- CLI exit codeとcanonical JSON bytes
- obligationのrule ID、constraint ID、fingerprint、classification
- policy diagnostic code
- endpoint resolution status（valid alias controlのみ）
- report persistenceの有無と再導出後の不変性

valid aliasはmutationではあるがviolationではない。ADR-034のprecedenceに従い`resolved-via-alias`となり、exit 0を期待する。

