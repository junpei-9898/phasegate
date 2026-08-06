---
traceability:
  initial_creation: true
work_item: WI-367
---

# WI-367 Domain Model（templates サーフェス）

<!-- @work-item-id WI-367 -->

Unit: `ci-governance`

## 追加する値オブジェクト

### TemplateName

テンプレート識別子。**ファイルパスではない**。

| 項目 | 内容 |
|------|------|
| 不変条件 | `/^[a-z0-9][a-z0-9_-]*$/` に一致する |
| 拒否する入力 | 空文字 / `.` / `..` / `/` / `\` / 大文字 / 先頭記号 / 空白 / 拡張子付き |
| 生成 | `create(input)` は違反時に `InvalidTemplateNameError` |
| 述語 | `isValid(input)` は例外を投げずに真偽を返す |

**役割の限定**: path traversal の第一防壁であって最終防壁ではない。
最終防壁は catalog（readdir 結果）との完全一致照合。VO 単体を強くしても、
解決経路が `path.join(dir, userInput)` である限り防御にならないため、
「入力を検証する」ではなく「入力をパスに使わない」を設計の芯に置く。

### TemplateCatalogEntry

`templates/` に実在する 1 テンプレートの記述子。

| 属性 | 意味 |
|------|------|
| `name` | `TemplateName`。`<name>.template.<ext>` の `<name>` 部分 |
| `fileName` | readdir が返した実ファイル名（ユーザー入力を含まない） |
| `extension` | `md` / `ts` など |

`fromFileName(fileName)` は命名規約に合わない、または `name` 部分が
`TemplateName` の不変条件を満たさないファイル名に対し `null` を返す
（catalog から静かに除外する。例外にすると `templates/` に無関係な
ファイルが 1 つ落ちているだけで `templates list` 全体が落ちるため）。

## ポート

| ポート | 操作 |
|--------|------|
| `TemplateCatalogPort` | `directoryPath()` / `list()` / `read(name)` |

`list()` はディレクトリ不在で例外を投げず空配列を返す。
`read(name)` は catalog に一致が無ければ `null` を返す（「見つからない」は
異常ではなく通常の分岐であり、例外にすると呼び出し側が握り潰しやすい）。

## 不変条件

1. `read` が返す本文は、必ず `list` に現れるエントリの本文である。
   （`templates/` の外にある同名ファイルは決して読まれない）
2. `list` の順序は name 昇順で決定的（同名時は fileName で決定）。
