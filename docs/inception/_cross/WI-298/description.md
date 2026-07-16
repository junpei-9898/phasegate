---
id: WI-298
type: story
severity: high
status: drafted
affects: [world-model, skill-quality]
source: internal
---

# WI-298: Self-repo World adoption baseline and dogfood

<!-- @work-item-id WI-298 -->

## 背景

WM-12〜16でWorld constraint、fingerprint、policy、CLI、synthetic mutation E2Eが完成した。WM-17では最終self-repo corpusを承認済みrulesetで実測し、再現したstructural violationだけをclosed adoption baselineとして採用する。既知の意味的負債はstructural findingと混同せずexplicit debtとしてimportする。

## 実施順序

1. WI / product reflection、H17-12 test、semantic debt annotationを先に反映する。
2. requirement-test matrixを再生成し、最終corpusを固定する。
3. baselineなしで`world:derive --json`を2回実行し、serialized bytesとfingerprint集合を比較する。
4. WCR-001、constraint付きnew claim / pin、malformed policy inputを除外し、実在するadoptable fingerprintだけをbaseline candidateにする。
5. `sourceEvaluationId`、`sourceCorpusRoot`、`sourceConstraintRoot`とsorted entryを記録する。
6. baseline適用後に2回deriveし、全current findingが`adopted-legacy`、repaid / new / policy diagnosticが0、exit 0であることを確認する。

## 受け入れ基準

- 推測件数を置かず、最終checkoutの二重実測値だけを採用する。
- fingerprint集合とserialized candidate bytesが二回で一致する。
- baseline entry集合がcurrent structural obligation集合と厳密一致する。
- baselineはsame-ruleset closed setで、`adoptedByWorkItemId: WI-298`とreview理由を持つ。
- skill-qualityのungated coverage reportをexplicit semantic debt IDで宣言・参照し、L2-016のwarning semanticsを変えない。
- dogfood smokeがmatrix再生成後のself-repoで二重derive、baseline一致、増分0、exit 0を検証する。
- H17-12をtestと同じ着地で`planned -> required`へ進める。

## スコープ外

- L2-017 / L3-008 validator登録とblocking integration
- baseline entry追加を許す運用
- L2-016の返済またはcoverage reportのgreen化
- attestation v2 / CI順序変更

