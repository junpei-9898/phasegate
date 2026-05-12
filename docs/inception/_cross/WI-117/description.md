---
id: WI-117
type: issue
severity: normal
status: tested
affects: [validator-system, traceability-model, biome-ast-engine, harness-api]
source: internal
---

# WI-117: L4 drift detection precision must be improved before gating use

> 起票日: 2026-05-09
> 起票経緯: WI-107〜WI-116 dogfood 後のレビューで、L4 drift detector は advisory report 基盤としては有効だが、Unit 解決・設計抽出・export 抽出・pointer 粒度により false positive / false negative が残ることを確認した。

## 背景

L4 drift detector は `phasegate:detect-drift --json` で repository scale の設計⇔実装乖離を advisory report として返せるようになった。一方、現状の解析は gate として常用するには粗い。

確認済みの主な課題:

- drift 照合が `Unit + element` ではなく全 Unit 横断の element Set で行われ、別 Unit の同名要素が偶然一致すると drift が隠れる。
- 実装側 Unit 解決は `@unit` metadata ではなく `scripts/harness/{unit}/...` の path convention に依存している。
- 設計側抽出は主に `docs/product/construction/{unit}/domain_model.md` の `##` / `###` 見出しに限定され、`logical_design.md`、表、箇条書き、明示 annotation を十分に扱えていない。
- TypeScript export 抽出は `export` 修飾付き declaration が中心で、`export { Foo }` / `export * from` / default export / barrel re-export を public surface として正確に扱えていない。
- pointer match が file 単位で広く、1 つの設計 pointer が同一ファイル内の未設計 export まで隠す可能性がある。

これは L4 drift の新機能追加ではなく、WI-114 で整えた advisory reporting を将来 gating 候補にできる品質へ上げるための解析精度改善である。

## 本 WI でやること

1. drift 判定キーを `element` 単体から `unit + element` へ変更し、同名要素が別 Unit にある場合の false negative を防ぐ。
2. 実装側 Unit 解決で `@unit` metadata を第一候補にし、path-derived Unit は fallback として扱う。
3. 設計側抽出対象を `domain_model.md` だけでなく、必要な product construction docs と明示 drift annotation / pointer へ拡張する。
4. TypeScript export 抽出で re-export / default export / barrel file の扱いを定義し、実装する。
5. pointer match を file-level blanket match から、設計要素と実装要素の対応粒度が分かる model へ狭める。
6. false positive / false negative の regression fixture を追加し、L4 drift を advisory から gating 候補へ進められる品質基準を明文化する。

## 受け入れ基準

- [ ] 同名 element が複数 Unit に存在しても、Unit を跨いだ一致で drift が隠れない。
- [ ] `@unit` metadata と path-derived Unit が衝突する場合の優先順位と warning 方針が docs / tests に残っている。
- [ ] `domain_model.md` 以外の product construction docs で明示された設計要素または pointer が drift 判定に反映される。
- [ ] `export { Foo }` / `export * from` / default export / barrel re-export の扱いが実装とテストで固定されている。
- [ ] pointer が当たったファイル内の無関係 export を誤って matched 扱いしない。
- [ ] `phasegate:detect-drift --json` の category summary が、解析限界ではなく実際の design/code drift を優先的に表す。
- [ ] L4 drift を `--fail-on-warning` で使う前提条件が `docs/guide/layer-model.md` または product docs に明記されている。

## 関連

- WI-107: CI/L4 execution semantics must be unified
- WI-114: L4 drift detector output must become actionable at repository scale
- WI-115: `legacy_id` ambiguity should be unit-scoped or validated
