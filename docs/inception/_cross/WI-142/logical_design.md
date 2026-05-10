# WI-142 Logical Design

<!-- @work-item-id WI-142 -->

## Change

`ci:generate-template` treats omitted `--preset` as `standard`.

The default belongs at the CLI argument boundary in `scripts/harness/main.ts`, because lower layers already model concrete preset IDs and should not know about CLI omission semantics.

## Rationale

`PresetConfigAdapter` supports `minimal`, `standard`, and `strict`. Passing `default` is not a valid domain value. The CLI should normalize absence to the stable public default preset before calling `GenerateCiTemplateHandler`.

## Verification

- Add an integration/E2E assertion that `ci:generate-template --type agent-context-refresh --render` succeeds without `--preset`.
- Keep explicit `--preset standard` behavior unchanged.

