---
id: WI-369
type: fix
severity: medium
status: implemented
affects: [ci-governance]
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
