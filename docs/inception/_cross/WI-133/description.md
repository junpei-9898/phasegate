---
id: WI-133
type: issue
severity: normal
status: tested
affects: [validator-system, traceability-model, config-foundation, documentation]
source: internal
---

# WI-133: Boundary behavior coverage must be derived from contracts and models

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、正常系だけでなく boundary / invalid / duplicate / missing / disabled / idempotency などのケースを構造的に要求する必要があると整理した。

## 背景

レビューで見落としやすい品質問題の多くは境界条件に出る。domain model、schema、CLI option、config option、state machine から最低限必要な boundary cases を生成し、test observation と照合できれば、言語や framework に依存せず品質を底上げできる。

この WI は boundary case を hard-coded checklist ではなく、contract / model から導出する。

## 本 WI でやること

1. `BoundaryCase` model を定義する: empty input / missing required / invalid enum / duplicate id / unknown reference / permission denied / config disabled / partial failure / idempotency / backward compatibility。
2. domain model / schema / CLI option / config option / state machine から boundary cases を導出する extractor を設計する。
3. boundary case と test observation の対応を検証する。
4. required / recommended / advisory の severity policy を config 化する。
5. false positive を抑えるため、対象 contract ごとの opt-out / justification を設計する。

## 受け入れ基準

- [ ] boundary cases が contract / model から導出される。
- [ ] missing required / invalid enum / duplicate id / unknown reference の test 不足を report できる。
- [ ] config disabled / partial failure / idempotency の test 不足を report できる。
- [ ] required と advisory の severity が config で調整できる。
- [ ] test framework に依存しない observation model と接続できる。

## 関連

- WI-132: Public contracts must declare required behavior cases and matching tests
- WI-136: State machine integrity must verify transitions across docs code and tests
