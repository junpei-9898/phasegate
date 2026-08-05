---
id: WI-357
type: fix
severity: medium
status: drafted
affects: [validator-system]
source: GitHub issue #29（validate --layer L2 の L2-001 suggestion に復旧手順が無い）
---

# WI-357: Phase Gate の復旧手順を validate --layer L2 の出力へ届ける

<!-- @work-item-id WI-357 -->

## 背景

`npx phasegate validate --layer L2` が L2-001 で落ちたときの suggestion は
`'phase gate prerequisites are not met'` という固定文字列で、失敗事実の再掲しかしていなかった。
復旧手順は pre-tool-use hook の block メッセージ側にしか無く、
CLI から検証したエージェントは不足文書に何を書けばよいか分からないまま止まる。

## 修正

- `phase-dependency-phase-gate-policy-adapter.ts`: L2-001 の suggestion を
  `buildPhaseGateRecoverySuggestion()` が組み立てる実行可能な案内に置換する。
  scaffold-design コマンド（unit 名を埋め込み。空なら `<unit-id>` にフォールバック）、
  各文書のセクション構成が `skills/<skill>/SKILL.md` にあること、
  `skills/` 未配置時の `phasegate skills info` 経路の 3 点を載せる。
- `agent-validation-result-formatter.ts`: 複数行 suggestion の 2 行目以降を
  継続行としてインデントする。素朴に埋め込むと ERRORS ブロックの構造が壊れ、
  機械読みできなくなるため。
