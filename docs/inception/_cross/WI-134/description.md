---
id: WI-134
type: issue
severity: normal
status: drafted
affects: [validator-system, config-foundation, biome-ast-engine, documentation]
source: internal
---

# WI-134: Side effect capability boundaries must be enforced by architecture presets

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、既存の layer dependency check に加えて、filesystem / network / database / env / time / random などの副作用能力が正しい architecture zone に閉じているかを検証する必要があると整理した。

## 背景

既存 L1-003 / L1-004 は import direction と folder/layer metadata を検査する。一方、domain が `fs` や `fetch` を直接呼ぶ、UseCase が Port を通さず DB/HTTP を触る、といった副作用境界違反は import direction だけでは検出できない。

ただしこの policy は Clean / Onion / Hexagonal 固定にしてはいけない。PhaseGate は toolkit なので、architecture preset が zone と capability policy を定義し、validator は source adapter が抽出した effects を policy と照合する。

## 本 WI でやること

1. `Effect = filesystem | network | database | process-env | time | random | subprocess | user-io` などの semantic model を定義する。
2. architecture preset ごとに zone / allowed capabilities / denied capabilities を定義できる config schema を設計する。
3. Clean / Onion / Hexagonal / Layered / MVC / Vertical Slice / Plugin / custom の policy 表現を比較する。
4. TypeScript adapter は既存環境の effect extraction 実装として扱い、validator contract は language-independent に保つ。
5. L1-003 / L1-004 との責務分担を docs に明記する。

## 受け入れ基準

- [ ] side effect boundary が import dependency boundary と別概念として docs に定義されている。
- [ ] architecture preset が capability policy を持てる。
- [ ] Clean / Layered / MVC / Vertical Slice で異なる allowed effects を表現できる。
- [ ] denied capability の検出が file zone と effect semantic model の照合で行われる。
- [ ] L1-003 / L1-004 の既存挙動と競合しない。

## 関連

- L1-003: no-layer-violation
- L1-004: enforce-folder-structure
- `docs/principles/architecture-philosophy.md`
