# WI-251 Domain Model

## Concepts

| Concept | Owner | Meaning |
|---|---|---|
| File-tag-scoped attribution | phase-dependency-model | 複数 WI trailer を同梱するバッチコミットにおいて、`scripts/harness/{unit}/{layer}/` 配下の changed path をその WI に帰属させるかを、ファイル内容（HEAD）の `@work-item-id`/`@story` タグ集合で判定する精緻化。single-trailer コミットは対象外（全 changed path を帰属） |
| Over-attribution | phase-dependency-model | バッチコミットで changed paths が全 trailer WI に一律帰属し、実際にはそのファイルを書いていない WI が source-touch と誤判定される現象。WI-251 が除去対象とする false-positive の源 |
| Attribution monotonicity | phase-dependency-model | 帰属の精緻化は changed-paths 集合を狭める方向にのみ作用し、いかなる WI の source-touch も true→false にしか変えない。これにより反映要求の新規発火（added violation）が起きないことが構造的に保証される |

## Invariants

- INV-A（single-trailer 不変）: `Work-Item:` trailer が 1 個のコミットの changed paths 帰属は WI-246 から変化しない。
- INV-B（file-tag scoping）: 複数 trailer コミットが触った `scripts/harness/{unit}/{layer}/` 配下ファイルは、そのファイルの `@work-item-id`/`@story` タグに含まれる WI にのみ帰属する。
- INV-C（fail-closed）: 複数 trailer コミット × ソースパスでも、ファイルにタグが無い / 読めない（HEAD で削除済み等） / 判定不能の場合は帰属を維持する。不確実性はゲートを甘くする方向に倒さない。
- INV-D（monotonicity）: 任意 storyId の changedPaths 集合は WI-246 実装の部分集合であり、`storyTouchesUnitLayer` の結果は true→false にのみ変化する。よって blocking violation 集合も部分集合（added=0）。
- INV-E（port 不変）: `StoryReflectionFileSystemPort.storyTouchesUnitLayer(storyId, unitId, layer)` のシグネチャ・意味論は変更しない。精緻化は adapter 内部の changed-paths 算出に閉じ、domain 層は帰属手段（git 履歴 + file tag）を知らない。

## Port

- `StoryReflectionFileSystemPort.storyTouchesUnitLayer(storyId, unitId, layer): Promise<boolean>` — WI-246 で追加済み。本 WI では変更しない。内部実装の帰属精度のみ向上する。
