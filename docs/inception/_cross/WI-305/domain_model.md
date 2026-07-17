# WI-305 Domain Model: Design change declaration

<!-- @work-item-id WI-305 -->

## ChangedDesignFragment

traceability-model providerが返すplain fact。`corpusRole`、`declaredKey`、`path`、`changeKind`、sorted `workItemIds`、sorted `reflectionTargets`を持つ。identityはADR-032のrole + DeclaredKeyであり、heading text / orderを使わない。

## PinnedDesignEndpoint

world-model providerが返すplain fact。`constraintId`、`endpoint`、`nodeId`、`corpusRole`、`declaredKey`を持つ。constraint declarationのclaimant / premise pinを投影するだけで、constraintの意味やblocking policyを持たない。

## DesignChangeDeclarationPolicy

validator-system domain service。changed fragmentとpinned endpointをrole + DeclaredKeyで突合し、fragmentのWork Item集合とcommit trailer集合の共通部分を検証する。

結果は次の3状態とする。

- `skipped`: World無効。providerを呼ばない。
- `evaluated`: declaration一致 / 不一致を決定的順序で返す。不一致だけがblocking。
- `unavailable`: input observation不能。固定code warningでfail-openする。

## Invariants

- unpinned fragmentはdeclaration対象でない。
- reflection targetは明示markerだけを事実化し、自動生成しない。
- change provenanceはstaged baseline/current差分であって因果ではない。
- local declaration resultはL3 authorityを置換しない。
