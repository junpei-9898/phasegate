# WI-199 Logical Design

@story-id H11-01
## Scope

Unit: `installation`

## Flow

1. Load protected file policy from config or default protected list.
2. While building uninstall plan, classify each target path.
3. If `changed:true` and protected:
   - set `protected:true`;
   - include `protectionReason`;
   - route to `refused` for apply unless an explicit force/acknowledgement option is present.
4. Emit a top-level warning summary for protected planned mutations in human and JSON output.

## CLI Contract

Existing `--force` handles hash mismatch and ai-assisted apply. Protected-file mutation should not be hidden behind generic force unless help text explicitly documents that behavior. Prefer a specific `--force-protected` or acknowledgement flag if product direction allows a new option.

## Product Reflection Targets

実装前に以下へ `@work-item-id WI-199` を反映する。

- `docs/product/construction/installation/domain_model.md`
- `docs/product/construction/installation/logical_design.md`
- `docs/product/construction/installation/it_test_design.md`
