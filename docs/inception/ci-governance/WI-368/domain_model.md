---
traceability:
  initial_creation: true
work_item: WI-368
---

# WI-368 Domain Model（InceptionDocKind）

<!-- @work-item-id WI-368 -->

Unit: `ci-governance`

## InceptionDocKind（値オブジェクト）

scaffold 可能な inception / product 文書の種別。`DesignPhase` と同型だが
**unit 軸を持たない**。

| 項目 | 内容 |
|------|------|
| 許容値 | `product-overview-plan` / `product-overview` / `story-writer-plan` / `story-mapping-plan` / `unit-design-plan` |
| 生成 | `create(input)` は未知値で許容値一覧付きの例外 |
| 述語 | `isValid(input)`（型ガード） |
| 導出 | `templateFileName` / `docFileName` |
| 解決 | `relativeTargetPath(roots)` |

### 書き込み先の解決規則

`InceptionDocRoots { inceptionDocsRoot, designDocsRoot }` を受け取り、
プロジェクトルートからの相対パス（POSIX 区切り）を返す。

- `*-plan` → `{inceptionDocsRoot}/_shared/{docFileName}`
- `product-overview` → `dirname({designDocsRoot})/product_overview.md`

`product-overview` の規則は phase node 定義の
`{designDocsRoot}/../product_overview.md` と同一でなければならない。
両者がズレると「scaffold したのにゲートが落ちる」が再発する。

末尾スラッシュ付きの roots（`mydocs/inception/`）でも二重スラッシュを作らない。

## ポート

| ポート | 操作 |
|--------|------|
| `InceptionTemplateRepositoryPort` | `resolvePath(kind)` / `read(kind)`（不在時は例外） |
| `InceptionDocWriterPort` | `resolvePath(kind)` / `exists(kind)` / `write(kind, content)` |

`read` はテンプレート不在を例外にする（同梱物の欠落は異常）。
一方 `TemplateCatalogPort.read` は `null` を返す（ユーザー入力ミスは通常分岐）。
この非対称は意図的である。

## 不変条件

1. `relativeTargetPath` は同じ roots に対して決定的。
2. 書き込みは `exists() === false` または `force === true` のときのみ行う。
3. テンプレート本文はプレースホルダ置換なしでそのまま書き込む
   （unit 軸が無く、置換すべき値が存在しないため）。
