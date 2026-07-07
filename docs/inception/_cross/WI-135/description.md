---
id: WI-135
type: issue
severity: normal
status: tested
affects: [validator-system, config-foundation, documentation]
source: internal
---

# WI-135: Decision placement must be reported against architecture zone responsibilities

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、ビジネス判断や validation rule や state transition が architecture 上の適切な zone に置かれているかを advisory に検出したいと整理した。

## 背景

Layer dependency が正しくても、UseCase に業務ルールが集中する、Adapter に domain decision が混ざる、DTO mapper に validation rule が入る、presentation が domain rule を知る、といった問題は起きる。これらは完全な true/false 判定が難しいが、decision density / domain terms / error construction / state transition の出現場所を semantic signal として report できる。

この WI は hard fail より advisory を基本とし、architecture preset ごとの zone responsibility と照合する。

## 本 WI でやること

1. `DecisionSignal` model を定義する: business rule branch / validation rule / error construction / state transition / policy selection。
2. architecture zone ごとの expected decision responsibility を config 化する。
3. UseCase / Adapter / Mapper / Presentation での decision density を report する。
4. false positive を避けるため、confidence と explanation を含む advisory finding にする。
5. Clean / Layered / MVC / Vertical Slice で異なる policy を表現できるようにする。

## 受け入れ基準

- [x] decision placement が architecture preset に依存する policy として定義されている。
- [x] UseCase に過剰な business rule branch がある場合に advisory を出せる。
- [x] Adapter / Mapper / Presentation に domain decision が混ざる smell を report できる。
- [x] finding に confidence / evidence / suggested owner zone が含まれる。
- [x] hard fail ではなく advisory rollout から開始する方針が docs にある。

## 関連

- WI-134: Side effect capability boundaries must be enforced by architecture presets
- `docs/principles/architecture-philosophy.md`
