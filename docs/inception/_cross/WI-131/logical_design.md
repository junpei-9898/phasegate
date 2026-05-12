# WI-131 Logical Design

<!-- @work-item-id WI-131 -->

## Flow

1. WI-125 の source adapters が AC と test reference を収集する。
2. generated matrix の story / AC mapping を基準に observation basis を作る。
3. `EvaluateRequirementIntentCoverageUseCase` が AC ごとに `observed`, `weakly-observed`, `unobserved` を分類する。
4. `@story` 不足、unknown story、test name だけの弱い対応は warning として report する。

WI-131 は WI-125 の matrix generation と競合しない。WI-125 が入力を生成し、WI-131 が同じ report 上に intent coverage を付加する。
