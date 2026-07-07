---
id: WI-125
type: story
severity: normal
status: tested
affects: [nyquist-validation, validator-system]
source: internal
---

# WI-125: L3 Nyquist requirement-test matrix must be generated automatically

> 起票日: 2026-05-09
> 起票経緯: README review で、L3 Nyquist Validation の `requirement-test-matrix.json` 自動生成が未自動化であり、README でも manual setup として明記されていることを確認した。

## 背景

Nyquist validation は `requirement-test-matrix.json` を読み、requirement / acceptance criteria / test reference の双方向 traceability を検証できる。一方、matrix 自体は現時点で手動作成前提であり、PhaseGate が掲げる「要求定義から test discipline までを agent が自走できる」体験に対して運用負荷が残っている。

これは既存 Nyquist validator の置き換えではなく、product docs と test metadata から matrix を生成・更新する導線を追加し、L3 validator が実務で使える入力を安定して得られるようにする改善である。

## 本 WI でやること

1. product docs から user story / acceptance criteria / requirement identifier を抽出する source adapter を設計する。
2. test files の `@story` / `@work-item-id` / test name / file path から test reference を抽出する。
3. `requirement-test-matrix.json` を新規生成・差分更新する CLI または既存 command extension を追加する。
4. 既存 matrix を壊さず、人手で補足した項目を保持する merge policy を定義する。
5. generated matrix を L3 Nyquist validator に渡して validation / coverage / impact-analysis が動くことを確認する。

## 受け入れ基準

- [ ] 手動で空の `requirement-test-matrix.json` を書かなくても、product docs と tests から初期 matrix を生成できる。
- [ ] 既存 matrix に手動追記された metadata を失わずに更新できる。
- [ ] unknown story / missing test / orphan test の report が生成前後で説明可能である。
- [ ] `validate --layer L3` または関連 Nyquist command との実行順序が docs に明記されている。
- [ ] consumer project dogfood で matrix generation → L3 validation の流れを確認できる。

## 関連

- README known limitation: `requirement-test-matrix.json` auto-generation is not automated yet
- `scripts/harness/nyquist-validation/`
- `scripts/harness/traceability-model/`
