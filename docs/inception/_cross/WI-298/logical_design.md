# WI-298 Logical Design: Self-repo measurement and dogfood

<!-- @work-item-id WI-298 -->

## Measurement pipeline

```text
final tracked corpus + regenerated matrix
  -> world:inspect / world:derive without adoption baseline
  -> canonical JSON bytes A / B
  -> exact byte comparison
  -> unique sorted structural obligations
  -> deterministic rule / corpus kind / Unit inventory
  -> reviewed phasegate.world-baseline.json
  -> world:derive with baseline twice
  -> adopted set == baseline, new == repaid == policy diagnostics == 0
```

candidate測定時はbaseline fileを入力にしない。baseline適用後のevaluationIdはpolicyInputsDigestが変わるためcandidateの`sourceEvaluationId`と異なる。

## Root provenance

- `sourceCorpusRoot`は同じfinal corpusの`world:inspect`結果から記録する。
- `sourceConstraintRoot`は空constraints declaration set、`phasegate-world-wcr/v1`、WM-15と同じconstraint config projectionからcanonical導出する。
- `sourceEvaluationId`はbaselineなしcandidate reportの値を記録する。

## Dogfood smoke

self-repo testは先にmatrixを再生成し、`world:derive --json`を二回実行する。raw JSON bytes、exit 0、全obligationの`adopted-legacy`、baselineとのexact fingerprint equality、repaid / policy diagnostic 0、semantic debt import equalityをassertする。保存reportや手動allowlistを信頼しない。

