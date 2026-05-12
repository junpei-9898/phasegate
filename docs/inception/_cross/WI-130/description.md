---
id: WI-130
type: issue
severity: normal
status: tested
affects: [validator-system, traceability-model, skill-quality, documentation]
source: internal
---

# WI-130: Assertion quality must be evaluated through semantic observation strength

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、assert の存在だけではなく「意味のある観測」をしているかを framework-agnostic に評価する必要があると整理した。

## 背景

AAA が test case の構造を担保するなら、Assertion Quality は Assert の強さを担保する。`toBeTruthy()` / snapshot only / length only / mock called count only のような弱い assertion は、test が存在しても意図した振る舞いを十分に観測していない可能性が高い。

この WI は matcher 名を直接 validator contract に埋め込まない。言語・framework adapter が assertion を `AssertionTarget` と `AssertionStrength` の semantic model に変換し、validator はその抽象モデルを評価する。

## 本 WI でやること

1. `AssertionTarget = observed output | state | emitted event | persisted effect | error contract | interaction` を定義する。
2. `AssertionStrength = exact value | shape | invariant | range | weak truthiness | snapshot only | interaction only` を定義する。
3. 弱い assertion の検出 policy を config 化する。
4. error case では error type / code / message / recovery hint などの contract assertion を要求できるようにする。
5. array length only / snapshot only / mock call count only を warning として分類する。

## 受け入れ基準

- [ ] assertion matcher 名に依存しない semantic model が product docs にある。
- [ ] 既存 TypeScript/Vitest adapter は matcher を semantic assertion に変換する adapter として扱われる。
- [ ] weak truthiness / snapshot only / length only / interaction only を検出できる。
- [ ] error contract assertion の不足を検出できる。
- [ ] Quick Mode の L2 test-quality と矛盾しない。

## 関連

- WI-129: L2 test-quality validator must enforce framework-agnostic AAA semantics
- `docs/principles/testing-rules.md`
