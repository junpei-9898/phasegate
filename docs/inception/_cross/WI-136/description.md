---
id: WI-136
type: issue
severity: normal
status: drafted
affects: [validator-system, traceability-model, documentation]
source: internal
---

# WI-136: State machine integrity must verify transitions across docs code and tests

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、状態を持つ概念について、docs の state machine、code enum / transition implementation、test observation が揃っているかを検証する必要があると整理した。

## 背景

PhaseGate 自体にも `drafted -> reflected -> implemented -> tested` のような状態遷移がある。状態を持つ概念は、未定義遷移、terminal state からの逆戻り、docs と code enum の不一致、遷移テスト不足が品質問題になりやすい。

この WI は state machine を language-independent model として扱い、docs / code / tests の三者を照合する。

## 本 WI でやること

1. `StateMachineModel` を定義する: states / transitions / guards / terminal states / invalid transitions。
2. docs から state machine を抽出する annotation または structured section を設計する。
3. code enum / transition function / error path を semantic model に変換する adapter 境界を設計する。
4. transition ごとの success / failure test observation を検証する。
5. WI status auto-update WI-126 と整合する。

## 受け入れ基準

- [ ] docs の state machine と code states の不一致を report できる。
- [ ] 未定義 transition 実装を report できる。
- [ ] terminal state からの不正遷移を report できる。
- [ ] 各 transition の success / failure test 不足を report できる。
- [ ] WI-126 の status state machine を最初の dogfood 対象にできる。

## 関連

- WI-126: Work item status must be derived and updated by PhaseGate
- WI-133: Boundary behavior coverage must be derived from contracts and models
