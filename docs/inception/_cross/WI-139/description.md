---
id: WI-139
type: issue
severity: normal
status: tested
affects: [validator-system, harness-api, documentation]
source: internal
---

# WI-139: Semantic drift must compare design intent implementation behavior and test observations

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、既存 L4 drift の design-code 比較を発展させ、Design intent / Implementation behavior / Test observations の三角形で乖離を検出する必要があると整理した。

## 背景

現在の L4 drift は design-code drift が中心である。しかし、本当に担保したいのは、設計意図が実装で表現され、その振る舞いが test で観測されていること、また test が design にない挙動を不必要に固定していないことである。

この WI は design / code / test をそれぞれ semantic model に変換し、三者の graph drift を検出する。

## 本 WI でやること

1. `DesignIntent` / `ImplementationBehavior` / `TestObservation` の semantic model を定義する。
2. design にある behavior が code にない、または code にある public behavior が design にないケースを検出する。
3. design / code にある behavior に対応する test observation がないケースを検出する。
4. test が design にない behavior を固定しているケースを warning として検出する。
5. 既存 L4-001 drift と WI-117 の精度改善と責務分担する。

## 受け入れ基準

- [ ] design-code-test の三者比較 model が docs に定義されている。
- [ ] design にある behavior が code/test のどちらかで欠落している場合に report できる。
- [ ] code に public behavior が増えたが design/test にない場合に report できる。
- [ ] test が design にない behavior を固定している場合に warning を出せる。
- [ ] L4-001 の existing drift report と重複せず、上位 semantic report として説明できる。

## 関連

- WI-117: L4 drift detection precision must be improved before gating use
- WI-131: Requirement-to-test intent coverage must verify observed acceptance criteria
- WI-138: Traceability completeness must connect WI Unit requirement design code and tests
