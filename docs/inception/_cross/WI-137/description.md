---
id: WI-137
type: issue
severity: normal
status: tested
affects: [validator-system, documentation]
source: internal
---

# WI-137: Error contract quality must be statically validated

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、エラーが単に throw / fail するだけでなく、利用者や agent が復旧できる contract を持つかを静的に検証する必要があると整理した。

## 背景

PhaseGate は HarnessError 形式を価値としている。error code、severity、message、suggestion、documentation reference、machine-readable fields、exit code contract が揃っていなければ、agent self-correction や user recovery が弱くなる。

この WI は error object の shape だけでなく、public contract / CLI / validator result と対応する error behavior を検証する。

## 本 WI でやること

1. `ErrorContract` model を定義する: stable code / severity / message / suggestion / doc ref / machine fields / exit code。
2. validator errors / CLI errors / domain errors を semantic model に変換する。
3. public command が返す error code と docs / tests の対応を検証する。
4. suggestion / next action が空または generic すぎる error を report する。
5. exit code と severity の整合を検証する。

## 受け入れ基準

- [ ] HarnessError 形式の必須 contract を静的に検査できる。
- [ ] stable error code がない public error を report できる。
- [ ] suggestion / documentation reference の不足を report できる。
- [ ] exit code と severity の不整合を report できる。
- [ ] error path test が不足している場合に WI-132 と連携して report できる。

## 関連

- WI-132: Public contracts must declare required behavior cases and matching tests
- `scripts/harness/harness-error/`
