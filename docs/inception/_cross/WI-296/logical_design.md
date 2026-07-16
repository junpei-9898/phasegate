# WI-296 Logical Design: World command integration

<!-- @work-item-id WI-296 -->

## Pin flow

```text
load Snapshot + constraints
  -> select ConstraintRecord by exact constraintId
  -> reject malformed / duplicate declaration diagnostics
  -> resolve selected endpoint exact or explicit single-hop alias
  -> construct before/after pin candidate
  -> preview OR serialize complete admitted document + atomic replace
```

constraint document serializerはrecord / aliasのsemantic fieldsだけをcanonical orderで出力する。baseline / waiver / debt / report repositoryを依存に持たない。

## Derive flow

```text
load Snapshot + constraints
  -> constraintRoot
  -> WCR full evaluation
  -> DeriveObligationsUseCase(policy repos)
  -> report + persistence status
  -> CLI exit classification / human or JSON rendering
```

rulesetは`phasegate-world-wcr/v1`、constraint / evaluation config digestはresolved canonical defaultsのversioned projectionから導出する。waiver dateはinjectable policy clockから一度だけ解決する。constraints file不在はempty explicit setで、implicit global uniqueness observationを引き続き評価する。

## CLI transport

world-model presentation handlerがflag parse、single envelope、human section順、exit 0/1/2を所有する。mainはconfig-foundationのresolved plain inputをcompositionへ渡し、handler resultをstdout / stderr / process exitへ写像するだけとする。

`--out`は`--write`と同時の場合だけwriter override pathへ渡す。PathKey違反はusage errorで、writerはraw reportだけを保存する。
