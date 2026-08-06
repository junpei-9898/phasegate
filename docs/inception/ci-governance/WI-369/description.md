---
id: WI-369
type: fix
severity: medium
status: implemented
affects: [ci-governance, phase-dependency-model]
source: GitHub issue #42 項目 3（G7: scaffold-design が paths.designDocs を無視）
---

# WI-369: `scaffold-design` が config の `paths.designDocs` を無視する

<!-- @work-item-id WI-369 -->

## 問題

`scripts/harness/ci-governance/composition-root.ts:123-125` が

```ts
const designDocWriter = new FileSystemDesignDocWriterAdapter(baseDir);
```

と resolvedConfig 抜きでアダプタを組み立てており、書き込み先が
`docs/product/construction` にハードコードされる。

`FileSystemDesignDocWriterAdapter` 自体は第 2 引数 `constructionSubDir` を
受け取れるのに、composition root がそれを渡していない。

## 影響

`paths.designDocs` を移設した PJ では **scaffold 先とゲート検査先がズレる**。
`check-phase-gate` は `paths.designDocs` を解決して `mydocs/product/construction/...`
を要求するのに、`scaffold-design --apply` は `docs/product/construction/...` に書く。
ユーザーは「テンプレートを生成したのにゲートが落ちる」状態に置かれる。

## 修正

`buildCiGovernance` に解決済み paths を渡せるようにし、
`FileSystemDesignDocWriterAdapter` へ `paths.designDocs` を配線する。
main.ts は `resolvedConfig` から paths を渡す。

## 同系統の派生欠陥（phase-dependency-model）

調査中に同じ「config paths が一部経路にだけ届かない」欠陥をもう 1 件検出した。

`EvidenceBundleAssembler` は成果物存在検査へ解決済み `PathRoots` を渡していたが、
plan 文書の evidence 読み取りには渡しておらず、`MarkdownPlanDocumentReader` が
`Artifact.resolve(scope)` を既定ルートで解決していた。`paths.inceptionDocs` を
移設した PJ では `{inceptionDocs}/_shared/*_plan.md` が実在するのに
「plan文書が不足しています」で Level-1 ゲートが落ちる。

`PlanDocumentReaderPort.readEvidence` に任意引数 `pathRoots` を追加し、
assembler が成果物検査と同一の pathRoots を渡すよう修正する。
省略時は既定ルートを使うため既存呼び出しの挙動は変わらない。
