# WI-297 Logical Design: Synthetic fixture runner

<!-- @work-item-id WI-297 -->

## Fixture layout

`scripts/harness/__tests__/fixtures/world-model/synthetic-mutations/`にbase corpus、matrix input、scenario manifestを置く。各testはtemp rootへbaseをcopyし、scenarioごとの差分だけを適用する。constraint pinはbaseline Snapshotの実digestから生成し、推測値を置かない。

## Evaluation flow

```text
materialize baseline corpus
  -> BuildSnapshot(baseline)
  -> materialize current mutation + control declarations
  -> BuildSnapshot(current)
  -> DeriveWorldObligations(current, optional baseline, fixed policy date)
  -> WorldDeriveCommandHandler JSON envelope / exit classification
```

production CLIはcomparison baselineを自動発見しない。fixture runnerだけがreview済みbaseline/current pairを明示し、baselineなしの通常CLI semanticsを変えない。

duplicate IDはextractor diagnosticからimplicit WCR-005へ投影する。malformed supported recordはWCR-001、unknown schemaはrepository admission failureとし、empty fallbackしない。

## Determinism / persistence

pure deriveを同一rootで2回実行し、JSON bytesを比較する。次に`.harness/world-obligations.json`へ任意bytesを置いて再実行し、clean resultと一致することを確認する。write modeのraw reportを手編集・削除しても、次のpure deriveはcontrol / corpusだけから同じresultを返す。

