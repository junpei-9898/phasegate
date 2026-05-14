# WI-197 Logical Design

@story-id H08-01
## Scope

Unit: `harness-api`

CLI entrypoint (`scripts/harness/main.ts`) の command dispatch に互換 alias layer を追加する。

## Flow

1. `rawCommand` を受け取る。
2. `rawCommand` が alias table に存在する場合、`canonicalCommand` へ置換する。
3. alias 経由の場合のみ deprecation notice を emit する。
4. 既存 `case "phasegate:status"` / `case "phasegate:complete-check"` へ通常どおり dispatch する。

## Error Handling

- Alias table にない command は現行どおり `Unknown command` と usage を返す。
- Alias notice の出力失敗は command execution を止めない。

## Product Reflection Targets

実装前に以下へ `@work-item-id WI-197` を反映する。

- `docs/product/construction/harness-api/logical_design.md`
- `docs/product/construction/harness-api/domain_model.md`
- `docs/product/construction/harness-api/it_test_design.md`
