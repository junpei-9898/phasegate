# WI-200 Logical Design

@story-id H12-04
## Scope

Unit: `ci-governance`

## Flow

1. Define an allowlist for `ci:generate-template` options.
2. Before parsing `--preset` / `--type`, scan args for unsupported `--*` options.
3. If unsupported options exist, return a structured CLI error:
   - human: `Unknown option: --kind`;
   - JSON: error envelope with option name;
   - exit code: 2.
4. Decide `--output` behavior:
   - either implement file writer port and document it;
   - or reject it like other unknown options.
5. Adjust human success banner so no-destination invocation does not imply file generation.

## Product Reflection Targets

実装前に以下へ `@work-item-id WI-200` を反映する。

- `docs/product/construction/ci-governance/domain_model.md`
- `docs/product/construction/ci-governance/logical_design.md`
- `docs/product/construction/ci-governance/it_test_design.md`
