---
id: WI-131
type: issue
severity: normal
status: drafted
affects: [nyquist-validation, traceability-model, validator-system, documentation]
source: internal
---

# WI-131: Requirement-to-test intent coverage must verify observed acceptance criteria

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、test existence だけでなく、product docs の acceptance criteria が test intent / assertion target / expected outcome と対応しているかを検証する必要があると整理した。

## 背景

Nyquist validation は requirements-test traceability の基盤だが、実務上は「AC に対応する test がある」だけでは弱い。test name、observed behavior、assertion target、expected outcome が AC と意味的に対応しているかを確認することで、「本当に作るべきものが作られているか」に近づける。

この WI は L3/L4 の semantic traceability 強化であり、特定 test framework の関数名ではなく、test semantic model と product docs の AC model を比較する。

## 本 WI でやること

1. product docs から acceptance criteria / expected behavior / error expectation を抽出する model を定義する。
2. test case semantic model から intent / assertion target / expected outcome を抽出する。
3. `@work-item-id` / `@story` / requirement id を AC と test observation の対応付けに使う。
4. AC ごとに observed / weakly observed / unobserved を分類する。
5. Nyquist matrix auto-generation WI-125 と整合する生成・検証 flow を設計する。

## 受け入れ基準

- [ ] AC と test case の対応が test existence ではなく observation basis で report される。
- [ ] test name だけで対応済みにしない。
- [ ] assertion target / expected outcome が AC とずれる場合に warning を出せる。
- [ ] `@work-item-id` / `@story` の不足または不一致が report される。
- [ ] WI-125 の matrix generation と競合しない。

## 関連

- WI-125: L3 Nyquist requirement-test matrix must be generated automatically
- WI-130: Assertion quality must be evaluated through semantic observation strength
