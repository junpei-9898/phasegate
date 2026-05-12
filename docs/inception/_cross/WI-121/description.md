---
id: WI-121
type: issue
severity: normal
status: tested
affects: [validator-system, harness-api, config-foundation]
source: internal
---

# WI-121: L3 performance validator must define practical detection scope and operating mode

> 起票日: 2026-05-09
> 起票経緯: L3-002 performance scanner review で、現状は file size と loop 内 await の検出に限定され、さらに standard run では skip されるため、実務でどう使う signal なのかが曖昧であることを確認した。

## 背景

L3-002 は performance validator として存在するが、現状の検出対象は限定的で、strictOnly / preset / threshold の運用も十分に説明されていない。実務で価値を出すには「何を検出し、何は検出しないか」を明確にし、CI / local / scheduled の使い分けを決める必要がある。

これは performance 機能の新規追加ではなく、既存 L3-002 を信頼できる運用 signal にする品質改善である。

## 本 WI でやること

1. L3-002 の検出 scope を file-size / await-in-loop / sync I/O / large JSON / hot path annotation などに分類する。
2. standard / strict / custom preset で L3-002 をいつ実行するかを明文化する。
3. threshold 設定の default と consumer override を整理する。
4. false positive を避けるため、batch / migration / CLI script などの許容パターンを定義する。
5. report に改善候補と運用 severity を含める。

## 受け入れ基準

- [x] L3-002 が skip される条件と実行される条件が docs / tests で固定されている。
- [x] await-in-loop 以外に、少なくとも 1 種類の実務的 performance smell を検出できる。
- [x] 許容パターンを config または inline annotation で抑制できる。
- [x] threshold 超過 report が対象 path / metric / threshold / suggestion を含む。
- [x] `phasegate:status --json` で L3-002 の skip/pass/fail が誤解なく読める。

## 関連

- WI-108: `phasegate:ci-check` must match its documented L2-L4 contract
- WI-112: `phasegate:status` must report trustworthy, non-stale state
