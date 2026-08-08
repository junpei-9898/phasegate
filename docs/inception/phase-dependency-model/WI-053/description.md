---
id: WI-053
type: story
severity: normal
status: reflected
legacy_id: H02-06
---

# H02-06: WI frontmatter affects-aware story reflection

## 背景

Phase C-1で story reflection は `docs/inception/_cross/WI-*` を列挙対象に含めた。一方で横断WIは全Unitに常に適用されるわけではなく、`description.md` frontmatter の `affects` で対象Unitを宣言している。

## 要求

- `_cross/WI-*` の `description.md` frontmatter から `affects` を読み取り、対象Unitに含まれる場合だけ reflection 対象にする。
- cross WI の inception mapping は `docs/inception/_cross/{storyId}/...` として解決する。
- Unit直下の既存 story / WI は従来通り `{unit}/{storyId}` として扱う。

## 完了条件

- `WI-026` が `affects: [order]` を持つ場合、`order` の reflection 対象になる。
- `affects` に含まれないUnitでは同じ WI が reflection 対象から除外される。
- frontmatter が読めない場合は安全側として対象に含め、既存挙動を壊さない。
